import { IsEnum, IsOptional, IsString, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '../../common/enums';

export class CreateAlertDto {
  @ApiPropertyOptional({ example: 'uuid-of-truck' })
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiProperty({ enum: AlertType, example: AlertType.OVERSPEED })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity, example: AlertSeverity.HIGH })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ example: 'Overspeed detected' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: 45.4642 })
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 9.19 })
  @IsOptional()
  lon?: number;
}

export class AlertListQueryDto {
  @ApiPropertyOptional({ enum: AlertType })
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @ApiPropertyOptional({ example: 'uuid-of-truck' })
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
