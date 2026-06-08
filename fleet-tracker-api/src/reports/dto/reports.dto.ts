import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../../common/enums';
import { FuelEntryType } from '../../fuel/dto/fuel.dto';

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv',
}

export class DailyReportQueryDto {
  @ApiProperty({ example: '2024-06-05' })
  @IsString()
  date: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class MonthlyReportQueryDto {
  @ApiProperty({ example: '2024-06' })
  @IsString()
  month: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class CustomReportQueryDto {
  @ApiProperty({ example: '2024-06-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-06-30' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class FuelReportQueryDto {
  @ApiProperty({ example: '2024-06-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-06-30' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ enum: FuelEntryType })
  @IsEnum(FuelEntryType)
  @IsOptional()
  type?: FuelEntryType;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class TripsReportQueryDto {
  @ApiProperty({ example: '2024-06-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-06-30' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ enum: TripStatus })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;

  @ApiPropertyOptional({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}
