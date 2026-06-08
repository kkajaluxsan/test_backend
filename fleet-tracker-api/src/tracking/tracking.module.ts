import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { TrackingPosition } from './entities/tracking-position.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { Trip } from '../trips/entities/trip.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingPosition, Truck, Trip, Driver]),
    forwardRef(() => WebsocketModule),
    forwardRef(() => AlertsModule),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
