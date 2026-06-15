import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Truck } from '../trucks/entities/truck.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { TruckStatus, AlertType, TripStatus } from '../common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {}

  async getSummary() {
    const today = new Date();
    const todayStart = new Date(today.toISOString().slice(0, 10));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalTrucks, activeTrucks, idleTrucks, offlineTrucks] =
      await Promise.all([
        this.truckRepository.count(),
        this.truckRepository.count({ where: { status: TruckStatus.ACTIVE } }),
        this.truckRepository.count({ where: { status: TruckStatus.IDLE } }),
        this.truckRepository.count({ where: { status: TruckStatus.OFFLINE } }),
      ]);

    const todayFleetKm = await this.sumTripKm(todayStart, today);
    const monthFleetKm = await this.sumTripKm(monthStart, today);

    const activeAlerts = await this.alertRepository.count({
      where: { resolvedAt: IsNull() },
    });
    const fuelAlerts = await this.alertRepository.count({
      where: [
        { resolvedAt: IsNull(), type: AlertType.LOW_FUEL },
        { resolvedAt: IsNull(), type: AlertType.LOW_ADBLUE },
      ],
    });

    return {
      totalTrucks,
      activeTrucks,
      idleTrucks,
      offlineTrucks,
      todayFleetKm: Number(todayFleetKm.toFixed(2)),
      monthFleetKm: Number(monthFleetKm.toFixed(2)),
      activeAlerts,
      fuelAlerts,
    };
  }

  private async sumTripKm(start: Date, end: Date) {
    const result = await this.tripRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.totalKm), 0)', 'total')
      .where('t.status = :status', { status: TripStatus.COMPLETED })
      .andWhere('t.startTime BETWEEN :start AND :end', { start, end })
      .getRawOne();

    return Number(result.total || 0);
  }
}
