import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Trip } from '../trips/entities/trip.entity';
import { TripStop } from '../trips/entities/trip-stop.entity';
import { DeliveryRecord } from '../trips/entities/delivery-record.entity';
import { FuelLog } from '../fuel/entities/fuel-log.entity';
import { AdblueLog } from '../fuel/entities/adblue-log.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { Truck } from '../trucks/entities/truck.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      TripStop,
      DeliveryRecord,
      FuelLog,
      AdblueLog,
      Driver,
      Truck,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
