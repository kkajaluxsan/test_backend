import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Truck } from '../trucks/entities/truck.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Alert } from '../alerts/entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Truck, Trip, Alert])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
