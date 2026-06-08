import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/entities/trip.entity';
import { TripStop } from '../trips/entities/trip-stop.entity';
import { DeliveryRecord } from '../trips/entities/delivery-record.entity';
import { FuelLog } from '../fuel/entities/fuel-log.entity';
import { AdblueLog } from '../fuel/entities/adblue-log.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { TripStatus } from '../common/enums';
import {
  CustomReportQueryDto,
  DailyReportQueryDto,
  FuelReportQueryDto,
  MonthlyReportQueryDto,
  TripsReportQueryDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripStop) private readonly tripStopRepository: Repository<TripStop>,
    @InjectRepository(DeliveryRecord) private readonly deliveryRepository: Repository<DeliveryRecord>,
    @InjectRepository(FuelLog) private readonly fuelLogRepository: Repository<FuelLog>,
    @InjectRepository(AdblueLog) private readonly adblueLogRepository: Repository<AdblueLog>,
    @InjectRepository(Driver) private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Truck) private readonly truckRepository: Repository<Truck>,
  ) {}

  async getDailyReport(query: DailyReportQueryDto) {
    const { start, end } = this.dayBounds(query.date);
    const trips = await this.getTripsInRange(start, end, query.driverId, query.truckId);

    if (trips.length === 0) {
      return {
        date: query.date,
        driverName: null,
        truckNumber: null,
        totalKm: 0,
        workingHours: 0,
        deliveryCount: 0,
        fuelLitres: 0,
        fuelCost: 0,
        adblueLitres: 0,
        adblueCost: 0,
        stops: [],
      };
    }

    const tripIds = trips.map((t) => t.id);
    const uniqueDriverIds = [...new Set(trips.map((t) => t.driverId))];
    const uniqueTruckIds = [...new Set(trips.map((t) => t.truckId))];

    let driverName: string | null = null;
    let truckNumber: string | null = null;

    if (uniqueDriverIds.length === 1) {
      const driver = await this.driverRepository.findOne({ where: { id: uniqueDriverIds[0] } });
      driverName = driver?.name ?? null;
    } else if (uniqueDriverIds.length > 1) {
      driverName = 'Multiple drivers';
    }

    if (uniqueTruckIds.length === 1) {
      const truck = await this.truckRepository.findOne({ where: { id: uniqueTruckIds[0] } });
      truckNumber = truck?.registrationNumber ?? null;
    } else if (uniqueTruckIds.length > 1) {
      truckNumber = 'Multiple trucks';
    }

    const totalKm = trips.reduce((sum, t) => sum + Number(t.totalKm || 0), 0);
    const workingHours = trips.reduce((sum, t) => {
      if (!t.endTime) return sum;
      return sum + (t.endTime.getTime() - t.startTime.getTime()) / (1000 * 60 * 60);
    }, 0);

    const deliveryCount = await this.deliveryRepository
      .createQueryBuilder('d')
      .where('d.tripId IN (:...tripIds)', { tripIds })
      .getCount();

    const fuelAgg = await this.fuelLogRepository
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.litres), 0)', 'litres')
      .addSelect('COALESCE(SUM(f.totalCost), 0)', 'cost')
      .where('f.tripId IN (:...tripIds)', { tripIds })
      .getRawOne();

    const adblueAgg = await this.adblueLogRepository
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.litres), 0)', 'litres')
      .addSelect('COALESCE(SUM(a.cost), 0)', 'cost')
      .where('a.tripId IN (:...tripIds)', { tripIds })
      .getRawOne();

    const stops = await this.tripStopRepository
      .createQueryBuilder('s')
      .where('s.tripId IN (:...tripIds)', { tripIds })
      .orderBy('s.sequence', 'ASC')
      .getMany();

    return {
      date: query.date,
      driverName,
      truckNumber,
      totalKm: Number(totalKm.toFixed(2)),
      workingHours: Number(workingHours.toFixed(2)),
      deliveryCount,
      fuelLitres: Number(fuelAgg.litres || 0),
      fuelCost: Number(fuelAgg.cost || 0),
      adblueLitres: Number(adblueAgg.litres || 0),
      adblueCost: Number(adblueAgg.cost || 0),
      stops: stops.map((s) => ({
        sequence: s.sequence,
        type: s.type,
        locationName: s.locationName,
        status: s.status,
        completedAt: s.completedAt,
      })),
    };
  }

  async getMonthlyReport(query: MonthlyReportQueryDto) {
    const [year, month] = query.month.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const trips = await this.getTripsInRange(start, end, query.driverId, query.truckId);
    const dailyBreakdown = await this.buildDailyBreakdown(trips, start, end);

    const summary = dailyBreakdown.reduce(
      (acc, day) => ({
        totalKm: acc.totalKm + day.km,
        totalHours: acc.totalHours + day.hours,
        totalDeliveries: acc.totalDeliveries + day.deliveries,
        totalFuelCost: acc.totalFuelCost + day.fuelCost,
      }),
      { totalKm: 0, totalHours: 0, totalDeliveries: 0, totalFuelCost: 0 },
    );

    return {
      month: query.month,
      summary: {
        totalKm: Number(summary.totalKm.toFixed(2)),
        totalHours: Number(summary.totalHours.toFixed(2)),
        totalDeliveries: summary.totalDeliveries,
        totalFuelCost: Number(summary.totalFuelCost.toFixed(2)),
      },
      dailyBreakdown,
    };
  }

  async getCustomReport(query: CustomReportQueryDto) {
    const start = new Date(query.startDate);
    const end = new Date(`${query.endDate}T23:59:59.999Z`);
    const trips = await this.getTripsInRange(start, end, query.driverId, query.truckId);
    const dailyBreakdown = await this.buildDailyBreakdown(trips, start, end);

    const summary = dailyBreakdown.reduce(
      (acc, day) => ({
        totalKm: acc.totalKm + day.km,
        totalHours: acc.totalHours + day.hours,
        totalDeliveries: acc.totalDeliveries + day.deliveries,
        totalFuelCost: acc.totalFuelCost + day.fuelCost,
      }),
      { totalKm: 0, totalHours: 0, totalDeliveries: 0, totalFuelCost: 0 },
    );

    return {
      startDate: query.startDate,
      endDate: query.endDate,
      summary: {
        totalKm: Number(summary.totalKm.toFixed(2)),
        totalHours: Number(summary.totalHours.toFixed(2)),
        totalDeliveries: summary.totalDeliveries,
        totalFuelCost: Number(summary.totalFuelCost.toFixed(2)),
      },
      dailyBreakdown,
    };
  }

  async getFuelReport(query: FuelReportQueryDto) {
    const start = new Date(query.startDate);
    const end = new Date(`${query.endDate}T23:59:59.999Z`);

    const fuelQb = this.fuelLogRepository
      .createQueryBuilder('f')
      .where('f.timestamp BETWEEN :start AND :end', { start, end });
    const adblueQb = this.adblueLogRepository
      .createQueryBuilder('a')
      .where('a.timestamp BETWEEN :start AND :end', { start, end });
    const tripsQb = this.tripRepository
      .createQueryBuilder('t')
      .where('t.startTime BETWEEN :start AND :end', { start, end });

    if (query.truckId) {
      fuelQb.andWhere('f.truckId = :truckId', { truckId: query.truckId });
      adblueQb.andWhere('a.truckId = :truckId', { truckId: query.truckId });
      tripsQb.andWhere('t.truckId = :truckId', { truckId: query.truckId });
    }

    const fuelLogs = query.type === 'ADBLUE' ? [] : await fuelQb.getMany();
    const adblueLogs = query.type === 'DIESEL' ? [] : await adblueQb.getMany();

    const totalLitres = fuelLogs.reduce((s, l) => s + Number(l.litres), 0);
    const totalCost = fuelLogs.reduce((s, l) => s + Number(l.totalCost), 0);
    const adblueTotal = adblueLogs.reduce((s, l) => s + Number(l.litres), 0);
    const adblueCost = adblueLogs.reduce((s, l) => s + Number(l.cost), 0);

    const tripAgg = await tripsQb
      .select('COALESCE(SUM(t.totalKm), 0)', 'totalKm')
      .getRawOne();
    const totalKm = Number(tripAgg.totalKm || 0);

    return {
      startDate: query.startDate,
      endDate: query.endDate,
      totalLitres,
      totalCost,
      avgLitresPer100km: totalKm > 0 ? Number(((totalLitres / totalKm) * 100).toFixed(2)) : 0,
      adblueTotal,
      adblueCost,
      adblueConsumptionRate: totalKm > 0 ? Number(((adblueTotal / totalKm) * 100).toFixed(2)) : 0,
      entries: [
        ...fuelLogs.map((l) => ({ type: 'DIESEL', litres: l.litres, cost: l.totalCost, timestamp: l.timestamp })),
        ...adblueLogs.map((l) => ({ type: 'ADBLUE', litres: l.litres, cost: l.cost, timestamp: l.timestamp })),
      ],
    };
  }

  async getTripsReport(query: TripsReportQueryDto) {
    const start = new Date(query.startDate);
    const end = new Date(`${query.endDate}T23:59:59.999Z`);

    const qb = this.tripRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.driver', 'driver')
      .leftJoinAndSelect('t.truck', 'truck')
      .where('t.startTime BETWEEN :start AND :end', { start, end });

    if (query.driverId) qb.andWhere('t.driverId = :driverId', { driverId: query.driverId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });

    const trips = await qb.orderBy('t.startTime', 'DESC').getMany();
    const result = [];

    for (const trip of trips) {
      const deliveries = await this.deliveryRepository.count({ where: { tripId: trip.id } });
      const durationHours = trip.endTime
        ? (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60 * 60)
        : 0;

      result.push({
        tripId: trip.id,
        driverName: trip.driver?.name,
        truckNumber: trip.truck?.registrationNumber,
        status: trip.status,
        totalKm: Number(trip.totalKm || 0),
        durationHours: Number(durationHours.toFixed(2)),
        deliveryCount: deliveries,
        startTime: trip.startTime,
        endTime: trip.endTime,
      });
    }

    return { trips: result };
  }

  private dayBounds(date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    return { start, end };
  }

  private async getTripsInRange(start: Date, end: Date, driverId?: string, truckId?: string) {
    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.startTime BETWEEN :start AND :end', { start, end })
      .andWhere('trip.status = :status', { status: TripStatus.COMPLETED });

    if (driverId) qb.andWhere('trip.driverId = :driverId', { driverId });
    if (truckId) qb.andWhere('trip.truckId = :truckId', { truckId });

    return qb.orderBy('trip.startTime', 'ASC').getMany();
  }

  private async buildDailyBreakdown(trips: Trip[], rangeStart: Date, rangeEnd: Date) {
    const days: Record<string, { km: number; hours: number; deliveries: number; fuelCost: number }> = {};

    for (const trip of trips) {
      const dateKey = trip.startTime.toISOString().slice(0, 10);
      if (!days[dateKey]) {
        days[dateKey] = { km: 0, hours: 0, deliveries: 0, fuelCost: 0 };
      }
      days[dateKey].km += Number(trip.totalKm || 0);
      if (trip.endTime) {
        days[dateKey].hours += (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60 * 60);
      }
      days[dateKey].deliveries += await this.deliveryRepository.count({ where: { tripId: trip.id } });

      const fuelCost = await this.fuelLogRepository
        .createQueryBuilder('f')
        .select('COALESCE(SUM(f.totalCost), 0)', 'cost')
        .where('f.tripId = :tripId', { tripId: trip.id })
        .getRawOne();
      days[dateKey].fuelCost += Number(fuelCost.cost || 0);
    }

    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        km: Number(data.km.toFixed(2)),
        hours: Number(data.hours.toFixed(2)),
        deliveries: data.deliveries,
        fuelCost: Number(data.fuelCost.toFixed(2)),
      }));
  }
}
