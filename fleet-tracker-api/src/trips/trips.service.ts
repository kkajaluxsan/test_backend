import { Injectable, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Trip } from './entities/trip.entity';
import { TripStop } from './entities/trip-stop.entity';
import { LoadPickup } from './entities/load-pickup.entity';
import { DeliveryRecord } from './entities/delivery-record.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { TripStatus, TruckStatus, StopStatus, StopType } from '../common/enums';
import { StartTripDto, AddStopsDto, ConfirmLoadDto, CompleteDeliveryDto, EndTripDto } from './dto/trips.dto';
import { FleetGateway } from '../websocket/fleet.gateway';
import { TrackingPosition } from '../tracking/entities/tracking-position.entity';
import { TrackingService } from '../tracking/tracking.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripStop) private readonly tripStopRepository: Repository<TripStop>,
    @InjectRepository(LoadPickup) private readonly loadPickupRepository: Repository<LoadPickup>,
    @InjectRepository(DeliveryRecord) private readonly deliveryRecordRepository: Repository<DeliveryRecord>,
    @InjectRepository(Truck) private readonly truckRepository: Repository<Truck>,
    @InjectRepository(Driver) private readonly driverRepository: Repository<Driver>,
    @InjectRepository(TrackingPosition)
    private readonly trackingRepository: Repository<TrackingPosition>,
    private readonly fleetGateway: FleetGateway,
    private readonly trackingService: TrackingService,
  ) {}

  async startTrip(userId: string, startTripDto: StartTripDto) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Driver not found' });

    const activeTrip = await this.tripRepository.findOne({
      where: { driverId: driver.id, status: Not(TripStatus.COMPLETED) },
    });

    if (activeTrip) {
      throw new ConflictException({ code: 'ACTIVE_TRIP_EXISTS', message: 'Driver already has an active trip' });
    }

    const truck = await this.truckRepository.findOne({ where: { registrationNumber: startTripDto.truckNumber } });
    if (!truck) throw new NotFoundException({ code: 'TRUCK_NOT_FOUND', message: 'Truck not found' });

    if (driver.assignedTruckId !== truck.id) {
      throw new ForbiddenException({
        code: 'TRUCK_NOT_ASSIGNED',
        message: 'You can only start a trip on your assigned truck',
      });
    }

    const trip = this.tripRepository.create({
      driverId: driver.id,
      truckId: truck.id,
      trailerNumber: startTripDto.trailerNumber,
      startingPlace: startTripDto.startingPlace,
      startingKm: startTripDto.startingKm,
      startTime: new Date(startTripDto.startTime),
      status: TripStatus.CREATED,
    });
    
    await this.tripRepository.save(trip);
    
    truck.status = TruckStatus.ACTIVE;
    await this.truckRepository.save(truck);
    await this.trackingService.seedTruckActiveGrace(truck.id);

    return trip;
  }

  async addStops(userId: string, tripId: string, addStopsDto: AddStopsDto) {
    const trip = await this.getDriverTrip(userId, tripId);
    
    const stops = addStopsDto.stops.map(stop => this.tripStopRepository.create({
      tripId: trip.id,
      sequence: stop.sequence,
      type: stop.type,
      locationName: stop.locationName,
      lat: stop.lat,
      lon: stop.lon,
      status: StopStatus.PENDING,
    }));

    await this.tripStopRepository.save(stops);
    
    trip.status = TripStatus.ROUTE_PLANNED;
    await this.tripRepository.save(trip);

    return this.tripRepository.findOne({ where: { id: trip.id }, relations: { stops: true } });
  }

  async confirmLoad(userId: string, tripId: string, stopId: string, confirmLoadDto: ConfirmLoadDto) {
    const trip = await this.getDriverTrip(userId, tripId);
    const stop = await this.getTripStop(tripId, stopId, StopType.LOAD_PICKUP);

    const loadPickup = this.loadPickupRepository.create({
      tripId,
      stopId,
      lat: confirmLoadDto.lat,
      lon: confirmLoadDto.lon,
      kmReading: confirmLoadDto.kmReading,
      gpsAccuracy: confirmLoadDto.gpsAccuracy,
      timestamp: new Date(confirmLoadDto.timestamp),
    });
    await this.loadPickupRepository.save(loadPickup);

    stop.status = StopStatus.CONFIRMED;
    stop.completedAt = new Date();
    await this.tripStopRepository.save(stop);

    trip.status = trip.status === TripStatus.ROUTE_PLANNED ? TripStatus.IN_PROGRESS : TripStatus.DELIVERING;
    await this.tripRepository.save(trip);

    this.fleetGateway.broadcastTripUpdated({ tripId, status: trip.status, currentStop: stopId, driverId: trip.driverId });

    return stop;
  }

  async completeDelivery(userId: string, tripId: string, stopId: string, completeDeliveryDto: CompleteDeliveryDto) {
    const trip = await this.getDriverTrip(userId, tripId);
    const stop = await this.getTripStop(tripId, stopId, StopType.DELIVERY);

    const deliveryRecord = this.deliveryRecordRepository.create({
      tripId,
      stopId,
      place: completeDeliveryDto.place,
      kmReading: completeDeliveryDto.kmReading,
      labourCharges: completeDeliveryDto.labourCharges,
      notes: completeDeliveryDto.notes,
      timestamp: new Date(completeDeliveryDto.timestamp),
    });
    await this.deliveryRecordRepository.save(deliveryRecord);

    stop.status = StopStatus.COMPLETED;
    stop.completedAt = new Date();
    await this.tripStopRepository.save(stop);

    trip.status = TripStatus.DELIVERING;
    await this.tripRepository.save(trip);

    this.fleetGateway.broadcastTripUpdated({ tripId, status: trip.status, currentStop: stopId, driverId: trip.driverId });

    return stop;
  }

  async endTrip(userId: string, tripId: string, endTripDto: EndTripDto) {
    const trip = await this.getDriverTrip(userId, tripId);
    
    if (endTripDto.endingKm < trip.startingKm) {
      throw new BadRequestException({ code: 'INVALID_KM', message: 'Ending KM cannot be less than Starting KM' });
    }

    const totalKm = endTripDto.endingKm - trip.startingKm;
    const endTime = new Date();

    trip.status = TripStatus.COMPLETED;
    trip.endingKm = endTripDto.endingKm;
    trip.totalKm = totalKm;
    trip.endTime = endTime;
    await this.tripRepository.save(trip);

    const truck = await this.truckRepository.findOne({ where: { id: trip.truckId } });
    if (truck) {
      truck.status = TruckStatus.OFFLINE;
      await this.truckRepository.save(truck);
    }

    return this.getTripSummary(tripId);
  }

  async findAll(query: any) {
    // Basic implementation of list
    const { driverId, truckId, status, startDate, endDate, limit = 10, page = 1 } = query;
    const qb = this.tripRepository.createQueryBuilder('trip');

    if (driverId) qb.andWhere('trip.driverId = :driverId', { driverId });
    if (truckId) qb.andWhere('trip.truckId = :truckId', { truckId });
    if (status) qb.andWhere('trip.status = :status', { status });
    if (startDate) qb.andWhere('trip.startTime >= :startDate', { startDate });
    if (endDate) qb.andWhere('trip.startTime <= :endDate', { endDate });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('trip.createdAt', 'DESC')
      .getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: { stops: true },
    });

    if (!trip) throw new NotFoundException({ code: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    
    const loadPickups = await this.loadPickupRepository.find({ where: { tripId: id } });
    const deliveryRecords = await this.deliveryRecordRepository.find({ where: { tripId: id } });

    return { ...trip, loadPickups, deliveryRecords };
  }

  private async getDriverTrip(userId: string, tripId: string) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'Driver not found' });

    const trip = await this.tripRepository.findOne({ where: { id: tripId, driverId: driver.id } });
    if (!trip) throw new NotFoundException({ code: 'TRIP_NOT_FOUND', message: 'Trip not found or unauthorized' });

    return trip;
  }

  async getRoute(tripId: string) {
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException({ code: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    }

    const positions = await this.trackingRepository.find({
      where: { tripId },
      order: { timestamp: 'ASC' },
    });

    return positions.map((pos) => ({
      lat: Number(pos.lat),
      lon: Number(pos.lon),
      speed: Number(pos.speed),
      heading: Number(pos.heading),
      timestamp: pos.timestamp,
    }));
  }

  async findByTruck(truckId: string, query: Record<string, unknown>) {
    return this.findAll({ ...query, truckId });
  }

  async findByDriver(driverId: string, query: Record<string, unknown>) {
    return this.findAll({ ...query, driverId });
  }

  private async getTripStop(tripId: string, stopId: string, expectedType: StopType) {
    const stop = await this.tripStopRepository.findOne({ where: { id: stopId, tripId } });
    if (!stop) throw new NotFoundException({ code: 'STOP_NOT_FOUND', message: 'Stop not found' });
    if (stop.type !== expectedType) {
      throw new BadRequestException({ code: 'INVALID_STOP_TYPE', message: `Expected ${expectedType} stop` });
    }
    return stop;
  }

  private async getTripSummary(tripId: string) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: { driver: true, truck: true },
    });

    if (!trip) {
      throw new NotFoundException({ code: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    }

    const deliveries = await this.deliveryRecordRepository.count({ where: { tripId } });
    const workingHours = trip.endTime
      ? (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60 * 60)
      : 0;

    return {
      date: trip.createdAt,
      driverName: trip.driver.name,
      truckNumber: trip.truck.registrationNumber,
      startingKm: trip.startingKm,
      endingKm: trip.endingKm,
      totalKm: trip.totalKm,
      workingHours: Number(workingHours.toFixed(2)),
      deliveryCount: deliveries,
      fuelEntriesSummary: [] // Will be populated by ReportsModule or FuelModule later
    };
  }
}
