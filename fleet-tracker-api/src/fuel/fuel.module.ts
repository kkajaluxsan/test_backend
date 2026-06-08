import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuelService } from './fuel.service';
import { FuelController } from './fuel.controller';
import { FuelLog } from './entities/fuel-log.entity';
import { AdblueLog } from './entities/adblue-log.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { Trip } from '../trips/entities/trip.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FuelLog, AdblueLog, Driver, Truck, Trip]),
    forwardRef(() => AlertsModule),
  ],
  providers: [FuelService],
  controllers: [FuelController],
  exports: [FuelService],
})
export class FuelModule {}
