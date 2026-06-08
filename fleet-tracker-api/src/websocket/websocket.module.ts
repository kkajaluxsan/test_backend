import { Global, Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FleetGateway } from './fleet.gateway';
import { TrackingModule } from '../tracking/tracking.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../drivers/entities/driver.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([Driver]),
    forwardRef(() => TrackingModule),
    forwardRef(() => AlertsModule),
  ],
  providers: [FleetGateway],
  exports: [FleetGateway],
})
export class WebsocketModule {}
