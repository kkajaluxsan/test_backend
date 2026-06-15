import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { TrackingService } from '../tracking/tracking.service';
import { Driver } from '../drivers/entities/driver.entity';
import { AlertsService } from '../alerts/alerts.service';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class FleetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        throw new Error('No token provided');
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      client.data.user = payload;

      if (
        payload.role === UserRole.SUPER_ADMIN ||
        payload.role === UserRole.FLEET_MANAGER
      ) {
        client.join('admin');
        this.logger.log(
          `Admin ${payload.email} connected and joined 'admin' room`,
        );
      } else if (payload.role === UserRole.DRIVER) {
        client.join(`driver:${payload.sub}`);

        const driver = await this.driverRepository.findOne({
          where: { userId: payload.sub },
          relations: { assignedTruck: true },
        });

        if (driver?.assignedTruckId) {
          client.join(`truck:${driver.assignedTruckId}`);
          this.logger.log(
            `Driver ${payload.email} joined 'driver:${payload.sub}' and 'truck:${driver.assignedTruckId}' rooms`,
          );
        } else {
          this.logger.log(
            `Driver ${payload.email} connected without assigned truck`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('GPS_UPDATE')
  async handleGpsUpdate(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    if (data.truckId) {
      client.join(`truck:${data.truckId}`);
    }

    const userId = client.data.user?.sub;
    if (!userId) {
      client.emit('ACK', {
        messageId: data.messageId,
        status: 'error',
        error: 'Unauthorized',
      });
      return;
    }

    try {
      await this.trackingService.processGpsUpdate(userId, data);
    } catch (error) {
      this.logger.error(
        `Error processing GPS update: ${(error as Error).message}`,
      );
    }

    client.emit('ACK', { messageId: data.messageId, status: 'received' });
    return;
  }

  @SubscribeMessage('TRIP_STARTED')
  handleTripStarted(@MessageBody() data: any) {
    // Broadcast to admin room
    this.server.to('admin').emit('TRIP_UPDATED', {
      tripId: data.tripId,
      status: 'IN_PROGRESS',
      driverId: data.driverId,
    });
  }

  @SubscribeMessage('STOP_COMPLETED')
  handleStopCompleted(@MessageBody() data: any) {
    // Broadcast to admin room
    this.server.to('admin').emit('TRIP_UPDATED', {
      tripId: data.tripId,
      status: 'DELIVERING',
      currentStop: data.stopId,
    });
  }

  @SubscribeMessage('IDLE_ALERT')
  async handleIdleAlert(@MessageBody() data: any) {
    this.server.to('admin').emit('TRUCK_IDLE', {
      truckId: data.truckId,
      idleMinutes: data.idleMinutes,
      lat: data.lat,
      lon: data.lon,
    });

    try {
      await this.alertsService.createIdleAlert(
        data.truckId,
        data.idleMinutes,
        data.lat,
        data.lon,
      );
    } catch (error) {
      this.logger.error(
        `Error processing idle alert: ${(error as Error).message}`,
      );
    }
  }

  // Helper methods to be called from other services
  broadcastTruckPosition(data: any) {
    this.server.to('admin').emit('TRUCK_POSITION', data);
  }

  broadcastAlertFired(data: any) {
    this.server.to('admin').emit('ALERT_FIRED', data);
  }

  broadcastSosTriggered(data: any) {
    this.server.to('admin').emit('SOS_TRIGGERED', data);
  }

  broadcastTruckOffline(data: any) {
    this.server.to('admin').emit('TRUCK_OFFLINE', data);
  }

  broadcastTripUpdated(data: any) {
    this.server.to('admin').emit('TRIP_UPDATED', data);
  }
}
