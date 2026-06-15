import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelLog } from './entities/fuel-log.entity';
import { AdblueLog } from './entities/adblue-log.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { Trip } from '../trips/entities/trip.entity';
import {
  CreateFuelEntryDto,
  FuelEntryType,
  FuelKpisQueryDto,
  FuelListQueryDto,
} from './dto/fuel.dto';
import { FuelType, AlertType } from '../common/enums';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelLog)
    private readonly fuelLogRepository: Repository<FuelLog>,
    @InjectRepository(AdblueLog)
    private readonly adblueLogRepository: Repository<AdblueLog>,
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
  ) {}

  async createEntry(userId: string, createFuelDto: CreateFuelEntryDto) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver)
      throw new NotFoundException({
        code: 'DRIVER_NOT_FOUND',
        message: 'Driver not found',
      });

    const trip = await this.tripRepository.findOne({
      where: { id: createFuelDto.tripId, driverId: driver.id },
    });
    if (!trip)
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });

    const truck = await this.truckRepository.findOne({
      where: { id: trip.truckId },
    });
    if (!truck)
      throw new NotFoundException({
        code: 'TRUCK_NOT_FOUND',
        message: 'Truck not found',
      });

    if (createFuelDto.type === FuelEntryType.DIESEL) {
      const totalCost = createFuelDto.litres * createFuelDto.pricePerLitre;
      const fuelLog = this.fuelLogRepository.create({
        tripId: trip.id,
        truckId: truck.id,
        driverId: driver.id,
        type: FuelType.DIESEL,
        litres: createFuelDto.litres,
        pricePerLitre: createFuelDto.pricePerLitre,
        totalCost,
        kmReading: createFuelDto.kmReading,
        location: createFuelDto.location,
        timestamp: new Date(createFuelDto.timestamp),
      });

      const saved = await this.fuelLogRepository.save(fuelLog);
      if (createFuelDto.litres > 800) {
        await this.alertsService.createFuelAnomalyAlert(
          truck.id,
          driver.id,
          'Unusually high fill-up recorded',
        );
      }
      return saved;
    }

    if (createFuelDto.type === FuelEntryType.ADBLUE) {
      const cost = createFuelDto.litres * createFuelDto.pricePerLitre;
      const adblueLog = this.adblueLogRepository.create({
        tripId: trip.id,
        truckId: truck.id,
        driverId: driver.id,
        litres: createFuelDto.litres,
        cost,
        kmReading: createFuelDto.kmReading,
        location: createFuelDto.location,
        timestamp: new Date(createFuelDto.timestamp),
      });

      const saved = await this.adblueLogRepository.save(adblueLog);
      if (createFuelDto.litres > 200) {
        await this.alertsService.createFuelAnomalyAlert(
          truck.id,
          driver.id,
          'Unusually high fill-up recorded',
          AlertType.LOW_ADBLUE,
        );
      }
      return saved;
    }

    throw new BadRequestException({
      code: 'INVALID_TYPE',
      message: 'Invalid fuel entry type',
    });
  }

  async findAll(query: FuelListQueryDto) {
    const { truckId, driverId, type, startDate, endDate } = query;
    const limit = Number(query.limit || 10);
    const page = Number(query.page || 1);

    const fuelQb = this.fuelLogRepository.createQueryBuilder('log');
    const adblueQb = this.adblueLogRepository.createQueryBuilder('log');

    if (truckId) {
      fuelQb.andWhere('log.truckId = :truckId', { truckId });
      adblueQb.andWhere('log.truckId = :truckId', { truckId });
    }
    if (driverId) {
      fuelQb.andWhere('log.driverId = :driverId', { driverId });
      adblueQb.andWhere('log.driverId = :driverId', { driverId });
    }
    if (startDate) {
      fuelQb.andWhere('log.timestamp >= :startDate', { startDate });
      adblueQb.andWhere('log.timestamp >= :startDate', { startDate });
    }
    if (endDate) {
      fuelQb.andWhere('log.timestamp <= :endDate', { endDate });
      adblueQb.andWhere('log.timestamp <= :endDate', { endDate });
    }

    const [fuelLogs, adblueLogs] = await Promise.all([
      type === FuelEntryType.ADBLUE ? [] : fuelQb.getMany(),
      type === FuelEntryType.DIESEL ? [] : adblueQb.getMany(),
    ]);

    const merged = [
      ...fuelLogs.map((log) => ({
        id: log.id,
        type: FuelEntryType.DIESEL,
        tripId: log.tripId,
        truckId: log.truckId,
        driverId: log.driverId,
        litres: log.litres,
        pricePerLitre: log.pricePerLitre,
        totalCost: log.totalCost,
        kmReading: log.kmReading,
        location: log.location,
        timestamp: log.timestamp,
      })),
      ...adblueLogs.map((log) => ({
        id: log.id,
        type: FuelEntryType.ADBLUE,
        tripId: log.tripId,
        truckId: log.truckId,
        driverId: log.driverId,
        litres: log.litres,
        cost: log.cost,
        kmReading: log.kmReading,
        location: log.location,
        timestamp: log.timestamp,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const total = merged.length;
    const paged = merged.slice((page - 1) * limit, page * limit);
    return { data: paged, meta: { total, page, limit } };
  }

  async getKpis(query: FuelKpisQueryDto) {
    const { truckId, startDate, endDate } = query;

    const fuelQb = this.fuelLogRepository.createQueryBuilder('log');
    const adblueQb = this.adblueLogRepository.createQueryBuilder('log');
    const tripsQb = this.tripRepository.createQueryBuilder('trip');

    if (truckId) {
      fuelQb.andWhere('log.truckId = :truckId', { truckId });
      adblueQb.andWhere('log.truckId = :truckId', { truckId });
      tripsQb.andWhere('trip.truckId = :truckId', { truckId });
    }
    if (startDate) {
      fuelQb.andWhere('log.timestamp >= :startDate', { startDate });
      adblueQb.andWhere('log.timestamp >= :startDate', { startDate });
      tripsQb.andWhere('trip.startTime >= :startDate', { startDate });
    }
    if (endDate) {
      fuelQb.andWhere('log.timestamp <= :endDate', { endDate });
      adblueQb.andWhere('log.timestamp <= :endDate', { endDate });
      tripsQb.andWhere('trip.startTime <= :endDate', { endDate });
    }

    const fuelAgg = await fuelQb
      .select('COALESCE(SUM(log.litres), 0)', 'totalLitres')
      .addSelect('COALESCE(SUM(log.totalCost), 0)', 'totalCost')
      .getRawOne();

    const adblueAgg = await adblueQb
      .select('COALESCE(SUM(log.litres), 0)', 'adblueTotal')
      .addSelect('COALESCE(SUM(log.cost), 0)', 'adblueCost')
      .getRawOne();

    const tripAgg = await tripsQb
      .select('COALESCE(SUM(trip.totalKm), 0)', 'totalKm')
      .getRawOne();

    const totalKm = Number(tripAgg.totalKm || 0);
    const totalLitres = Number(fuelAgg.totalLitres || 0);
    const totalCost = Number(fuelAgg.totalCost || 0);
    const adblueTotal = Number(adblueAgg.adblueTotal || 0);
    const adblueCost = Number(adblueAgg.adblueCost || 0);

    const avgLitresPer100km =
      totalKm > 0 ? Number(((totalLitres / totalKm) * 100).toFixed(2)) : 0;
    const adblueConsumptionRate =
      totalKm > 0 ? Number(((adblueTotal / totalKm) * 100).toFixed(2)) : 0;

    return {
      totalLitres,
      totalCost,
      avgLitresPer100km,
      adblueTotal,
      adblueCost,
      adblueConsumptionRate,
    };
  }
}
