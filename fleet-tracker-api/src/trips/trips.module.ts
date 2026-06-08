import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Trip } from './entities/trip.entity';
import { TripStop } from './entities/trip-stop.entity';
import { LoadPickup } from './entities/load-pickup.entity';
import { DeliveryRecord } from './entities/delivery-record.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { TrackingPosition } from '../tracking/entities/tracking-position.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripStop, LoadPickup, DeliveryRecord, Truck, Driver, TrackingPosition]),
    WebsocketModule,
    TrackingModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
