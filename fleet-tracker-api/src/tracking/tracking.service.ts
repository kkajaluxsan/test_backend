import {
  Injectable,
  Inject,
  Logger,
  forwardRef,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { TrackingPosition } from './entities/tracking-position.entity';
import { GpsUpdateDto, BatchGpsUpdateDto } from './dto/tracking.dto';
import { FleetGateway } from '../websocket/fleet.gateway';
import { Truck } from '../trucks/entities/truck.entity';
import { TripStatus, TruckStatus } from '../common/enums';
import { ConfigService } from '@nestjs/config';
import { AlertsService } from '../alerts/alerts.service';
import { Trip } from '../trips/entities/trip.entity';
import { Driver } from '../drivers/entities/driver.entity';

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackingService.name);
  private offlineCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(TrackingPosition)
    private readonly trackingRepository: Repository<TrackingPosition>,
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @Inject(forwardRef(() => FleetGateway))
    private readonly fleetGateway: FleetGateway,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
  ) {}

  onModuleInit() {
    this.offlineCheckInterval = setInterval(() => {
      this.checkForOfflineTrucks().catch((error) => {
        this.logger.error('Offline check failed', error);
      });
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
    }
  }

  async processGpsUpdate(userId: string, update: GpsUpdateDto) {
    await this.validateDriverGpsAccess(userId, update.truckId, update.tripId);
    this.assertTimestampFresh(update.timestamp, 60);

    const position = this.trackingRepository.create({
      truckId: update.truckId,
      tripId: update.tripId,
      lat: update.lat,
      lon: update.lon,
      speed: update.speed,
      heading: update.heading,
      accuracy: update.accuracy,
      altitude: update.altitude ?? null,
      timestamp: new Date(update.timestamp),
    });
    await this.trackingRepository.save(position);

    const redisData = {
      lat: update.lat,
      lon: update.lon,
      speed: update.speed,
      heading: update.heading,
      lastUpdate: update.timestamp,
    };
    await this.redis.set(
      `truck:${update.truckId}:position`,
      JSON.stringify(redisData),
      'EX',
      60,
    );
    await this.redis.del(`truck:${update.truckId}:active_since`);

    if (update.speed < 0.5) {
      await this.redis.set(
        `truck:${update.truckId}:last_movement`,
        update.timestamp,
        'EX',
        86400,
      );
    }

    this.fleetGateway.broadcastTruckPosition({
      truckId: update.truckId,
      ...redisData,
      bearing: update.heading,
    });

    await this.checkOverspeed(update);

    return { received: true };
  }

  async processBatchUpdate(userId: string, batch: BatchGpsUpdateDto) {
    if (!batch.positions || batch.positions.length === 0) {
      return { processed: 0, skipped: 0 };
    }

    if (batch.positions.length > 500) {
      throw new BadRequestException({
        code: 'BATCH_TOO_LARGE',
        message: 'Maximum 500 records per batch',
      });
    }

    const sortedPositions = [...batch.positions].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const validPositions: GpsUpdateDto[] = [];
    let skipped = 0;

    for (const pos of sortedPositions) {
      if (!this.isValidCoordinate(pos.lat, pos.lon)) {
        skipped += 1;
        continue;
      }

      if (this.isTimestampOlderThan(pos.timestamp, 7 * 24 * 60 * 60)) {
        skipped += 1;
        continue;
      }

      try {
        await this.validateDriverGpsAccess(userId, pos.truckId, pos.tripId);
        validPositions.push(pos);
      } catch {
        skipped += 1;
      }
    }

    if (validPositions.length === 0) {
      return { processed: 0, skipped };
    }

    const positionsToSave = validPositions.map((pos) =>
      this.trackingRepository.create({
        truckId: pos.truckId,
        tripId: pos.tripId,
        lat: pos.lat,
        lon: pos.lon,
        speed: pos.speed,
        heading: pos.heading,
        accuracy: pos.accuracy,
        altitude: pos.altitude ?? null,
        timestamp: new Date(pos.timestamp),
      }),
    );

    await this.trackingRepository.save(positionsToSave);

    const latest = validPositions[validPositions.length - 1];
    const redisData = {
      lat: latest.lat,
      lon: latest.lon,
      speed: latest.speed,
      heading: latest.heading,
      lastUpdate: latest.timestamp,
    };
    await this.redis.set(
      `truck:${latest.truckId}:position`,
      JSON.stringify(redisData),
      'EX',
      60,
    );
    await this.redis.del(`truck:${latest.truckId}:active_since`);

    this.fleetGateway.broadcastTruckPosition({
      truckId: latest.truckId,
      ...redisData,
      bearing: latest.heading,
    });

    await this.checkOverspeed(latest);

    return { processed: validPositions.length, skipped };
  }

  async seedTruckActiveGrace(truckId: string) {
    const graceSeconds =
      (this.configService.get<number>('OFFLINE_THRESHOLD_MINUTES', 5) + 2) * 60;
    await this.redis.set(
      `truck:${truckId}:active_since`,
      Date.now().toString(),
      'EX',
      graceSeconds,
    );
  }

  private async validateDriverGpsAccess(
    userId: string,
    truckId: string,
    tripId: string,
  ) {
    const driver = await this.driverRepository.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException({
        code: 'DRIVER_NOT_FOUND',
        message: 'Driver not found',
      });
    }

    if (driver.assignedTruckId !== truckId) {
      throw new ForbiddenException({
        code: 'TRUCK_NOT_ASSIGNED',
        message: 'GPS updates are only allowed for your assigned truck',
      });
    }

    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip || trip.driverId !== driver.id || trip.truckId !== truckId) {
      throw new ForbiddenException({
        code: 'TRIP_NOT_AUTHORIZED',
        message: 'GPS updates are only allowed for your active trip',
      });
    }

    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException({
        code: 'TRIP_COMPLETED',
        message: 'Trip is already completed',
      });
    }
  }

  private async checkOverspeed(update: GpsUpdateDto) {
    const overspeedThreshold = this.configService.get<number>(
      'OVERSPEED_THRESHOLD_KMH',
      110,
    );
    if (update.speed <= overspeedThreshold) {
      return;
    }

    const trip = await this.tripRepository.findOne({
      where: { id: update.tripId },
    });
    await this.alertsService.createOverspeedAlert(
      update.truckId,
      trip?.driverId ?? null,
      `Overspeed detected: ${update.speed} km/h`,
      update.lat,
      update.lon,
    );
  }

  private isValidCoordinate(lat: number, lon: number) {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private isTimestampOlderThan(timestamp: string, seconds: number) {
    const ts = new Date(timestamp).getTime();
    if (Number.isNaN(ts)) {
      return true;
    }
    return Date.now() - ts > seconds * 1000;
  }

  private assertTimestampFresh(timestamp: string, maxAgeSeconds: number) {
    if (this.isTimestampOlderThan(timestamp, maxAgeSeconds)) {
      throw new BadRequestException({
        code: 'STALE_TIMESTAMP',
        message: 'Timestamp is too old',
      });
    }
  }

  private async checkForOfflineTrucks() {
    const thresholdMinutes = this.configService.get<number>(
      'OFFLINE_THRESHOLD_MINUTES',
      5,
    );
    const thresholdMs = thresholdMinutes * 60 * 1000;

    const activeTrucks = await this.truckRepository.find({
      where: { status: TruckStatus.ACTIVE },
    });
    for (const truck of activeTrucks) {
      const positionStr = await this.redis.get(`truck:${truck.id}:position`);
      if (!positionStr) {
        const withinGrace = await this.isWithinActiveGrace(truck.id);
        if (!withinGrace) {
          await this.markTruckOffline(truck.id, null);
        }
        continue;
      }

      try {
        const pos = JSON.parse(positionStr);
        const lastUpdate = new Date(pos.lastUpdate || pos.timestamp).getTime();
        if (
          !Number.isNaN(lastUpdate) &&
          Date.now() - lastUpdate > thresholdMs
        ) {
          await this.markTruckOffline(
            truck.id,
            pos.lastUpdate || pos.timestamp,
          );
        }
      } catch {
        await this.markTruckOffline(truck.id, null);
      }
    }
  }

  private async isWithinActiveGrace(truckId: string) {
    const activeSince = await this.redis.get(`truck:${truckId}:active_since`);
    if (!activeSince) {
      return false;
    }
    const thresholdMinutes = this.configService.get<number>(
      'OFFLINE_THRESHOLD_MINUTES',
      5,
    );
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const startedAt = Number(activeSince);
    return !Number.isNaN(startedAt) && Date.now() - startedAt < thresholdMs;
  }

  private async markTruckOffline(truckId: string, lastSeen: string | null) {
    const truck = await this.truckRepository.findOne({
      where: { id: truckId },
    });
    if (!truck || truck.status !== TruckStatus.ACTIVE) {
      return;
    }

    truck.status = TruckStatus.OFFLINE;
    await this.truckRepository.save(truck);
    this.fleetGateway.broadcastTruckOffline({ truckId, lastSeen });
    await this.alertsService.createOfflineAlert(truckId);
  }
}
