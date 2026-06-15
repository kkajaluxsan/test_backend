import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { AuditLog } from '../common/entities/audit-log.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User, Driver, AuditLog]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
