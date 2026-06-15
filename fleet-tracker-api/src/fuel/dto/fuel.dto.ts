import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsUUID,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FuelEntryType {
  DIESEL = 'DIESEL',
  ADBLUE = 'ADBLUE',
}

export class CreateFuelEntryDto {
  @ApiProperty({ enum: FuelEntryType, example: FuelEntryType.DIESEL })
  @IsEnum(FuelEntryType)
  type: FuelEntryType;

  @ApiProperty({ example: 'uuid-of-trip' })
  @IsUUID()
  tripId: string;

  @ApiProperty({ example: 10800 })
  @IsNumber()
  @Min(0)
  kmReading: number;

  @ApiProperty({ example: 250.5 })
  @IsNumber()
  @Min(0)
  litres: number;

  @ApiProperty({ example: 1.85 })
  @IsNumber()
  @Min(0)
  pricePerLitre: number;

  @ApiProperty({ example: 'Milan Eni Station' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  @IsDateString()
  timestamp: string;
}

export class FuelListQueryDto {
  @ApiPropertyOptional({ example: 'uuid-of-truck' })
  @IsUUID()
  @IsOptional()
  truckId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ enum: FuelEntryType, example: FuelEntryType.DIESEL })
  @IsEnum(FuelEntryType)
  @IsOptional()
  type?: FuelEntryType;

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

export class FuelKpisQueryDto {
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
}
