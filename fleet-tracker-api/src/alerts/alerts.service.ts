import { Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Alert } from './entities/alert.entity';
import { CreateAlertDto, AlertListQueryDto } from './dto/alerts.dto';
import { AlertSeverity, AlertType } from '../common/enums';
import { FleetGateway } from '../websocket/fleet.gateway';
import { AuditLog } from '../common/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Inject(forwardRef(() => FleetGateway))
    private readonly fleetGateway: FleetGateway,
    private readonly notificationsService: NotificationsService,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async createAlert(dto: CreateAlertDto) {
    const alert = this.alertRepository.create({
      truckId: dto.truckId ?? null,
      driverId: dto.driverId ?? null,
      type: dto.type,
      severity: dto.severity,
      message: dto.message,
      lat: dto.lat ?? null,
      lon: dto.lon ?? null,
      timestamp: new Date(),
      resolvedAt: null,
    });

    const saved = await this.alertRepository.save(alert);
    await this.notify(saved);
    return saved;
  }

  async createOverspeedAlert(
    truckId: string,
    driverId: string | null,
    message: string,
    lat?: number,
    lon?: number,
  ) {
    const dedupeKey = `alert:overspeed:${truckId}`;
    const exists = await this.redis.get(dedupeKey);
    if (exists) {
      return null;
    }
    await this.redis.set(dedupeKey, '1', 'EX', 600);
    return this.createAlert({
      truckId,
      driverId: driverId ?? undefined,
      type: AlertType.OVERSPEED,
      severity: AlertSeverity.HIGH,
      message,
      lat,
      lon,
    });
  }

  async createIdleAlert(truckId: string, idleMinutes: number, lat?: number, lon?: number) {
    return this.createAlert({
      truckId,
      type: AlertType.IDLE,
      severity: AlertSeverity.MEDIUM,
      message: `Truck idle for ${idleMinutes} minutes`,
      lat,
      lon,
    });
  }

  async createFuelAnomalyAlert(
    truckId: string,
    driverId: string,
    message: string,
    type: AlertType = AlertType.LOW_FUEL,
  ) {
    return this.createAlert({
      truckId,
      driverId,
      type,
      severity: AlertSeverity.LOW,
      message,
    });
  }

  async createOfflineAlert(truckId: string) {
    const dedupeKey = `alert:offline:${truckId}`;
    const exists = await this.redis.get(dedupeKey);
    if (exists) {
      return null;
    }
    await this.redis.set(dedupeKey, '1', 'EX', 600);
    return this.createAlert({
      truckId,
      type: AlertType.OFFLINE,
      severity: AlertSeverity.HIGH,
      message: 'Truck offline: no GPS updates within threshold',
    });
  }

  async list(query: AlertListQueryDto) {
    const { type, severity, resolved, truckId, startDate, endDate } = query;
    const limit = Number(query.limit || 10);
    const page = Number(query.page || 1);

    const qb = this.alertRepository.createQueryBuilder('alert');

    if (type) qb.andWhere('alert.type = :type', { type });
    if (severity) qb.andWhere('alert.severity = :severity', { severity });
    if (truckId) qb.andWhere('alert.truckId = :truckId', { truckId });
    if (typeof resolved === 'boolean') {
      qb.andWhere(resolved ? 'alert.resolvedAt IS NOT NULL' : 'alert.resolvedAt IS NULL');
    }
    if (startDate) qb.andWhere('alert.timestamp >= :startDate', { startDate });
    if (endDate) qb.andWhere('alert.timestamp <= :endDate', { endDate });

    const [data, total] = await qb
      .orderBy('alert.resolvedAt', 'ASC', 'NULLS FIRST')
      .addOrderBy('alert.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { total, page, limit } };
  }

  async resolve(id: string, userId: string, ipAddress: string) {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException({ code: 'ALERT_NOT_FOUND', message: 'Alert not found' });
    }

    alert.resolvedAt = new Date();
    const saved = await this.alertRepository.save(alert);

    const auditLog = this.auditLogRepository.create({
      userId,
      action: 'ALERT_RESOLVED',
      entity: 'Alert',
      entityId: alert.id,
      ipAddress,
      timestamp: new Date(),
    });
    await this.auditLogRepository.save(auditLog);

    return saved;
  }

  private async notify(alert: Alert) {
    const payload = {
      alertType: alert.type,
      severity: alert.severity,
      truckId: alert.truckId,
      driverId: alert.driverId,
      message: alert.message,
      lat: alert.lat,
      lon: alert.lon,
    };

    if (alert.severity === AlertSeverity.CRITICAL) {
      this.fleetGateway.broadcastSosTriggered({
        driverId: alert.driverId,
        truckId: alert.truckId,
        lat: alert.lat,
        lon: alert.lon,
        timestamp: alert.timestamp,
      });
      await this.notificationsService.sendFcm(alert);
      await this.notificationsService.sendSms(`SOS ALERT: ${alert.message}`);
      return;
    }

    if (alert.severity === AlertSeverity.HIGH || alert.severity === AlertSeverity.MEDIUM) {
      this.fleetGateway.broadcastAlertFired(payload);
      await this.notificationsService.sendFcm(alert);
      return;
    }

    this.fleetGateway.broadcastAlertFired(payload);
  }
}
