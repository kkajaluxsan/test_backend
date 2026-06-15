import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      await this.logAudit(null, 'LOGIN_FAILED', ipAddress);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      await this.logAudit(user.id, 'LOGIN_FAILED', ipAddress);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    await this.logAudit(user.id, 'LOGIN_SUCCESS', ipAddress);

    let assignedTruckId = null;
    let assignedTruckNumber = null;
    let name = null;

    if (user.role === 'DRIVER') {
      const driver = await this.driverRepository.findOne({
        where: { userId: user.id },
        relations: { assignedTruck: true },
      });
      if (driver) {
        name = driver.name;
        if (driver.assignedTruck) {
          assignedTruckId = driver.assignedTruck.id;
          assignedTruckNumber = driver.assignedTruck.registrationNumber;
        }
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '30d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name,
        email: user.email,
        role: user.role,
        assignedTruckId,
        assignedTruckNumber,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      });

      return { accessToken };
    } catch (e) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }
  }

  private async logAudit(
    userId: string | null,
    action: string,
    ipAddress: string,
  ) {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      entity: 'Auth',
      ipAddress,
      timestamp: new Date(),
    });
    await this.auditLogRepository.save(auditLog);
  }
}
