import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StopType } from '../../common/enums';

export class StartTripDto {
  @ApiProperty({ example: 'MI-234AB' })
  @IsString()
  @IsNotEmpty()
  truckNumber: string;

  @ApiProperty({ example: 'TRL-001' })
  @IsString()
  @IsNotEmpty()
  trailerNumber: string;

  @ApiProperty({ example: 'Milan Hub' })
  @IsString()
  @IsNotEmpty()
  startingPlace: string;

  @ApiProperty({ example: 10500 })
  @IsNumber()
  @Min(0)
  startingKm: number;

  @ApiProperty({ example: '2024-01-01T08:00:00Z' })
  @IsDateString()
  startTime: string;
}

class StopDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  sequence: number;

  @ApiProperty({ enum: StopType, example: StopType.LOAD_PICKUP })
  @IsString()
  @IsNotEmpty()
  type: StopType;

  @ApiProperty({ example: 'Warehouse A' })
  @IsString()
  @IsNotEmpty()
  locationName: string;

  @ApiProperty({ example: 45.4642 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 9.1900 })
  @IsNumber()
  lon: number;
}

export class AddStopsDto {
  @ApiProperty({ type: [StopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopDto)
  stops: StopDto[];
}

export class ConfirmLoadDto {
  @ApiProperty({ example: 45.4642 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 9.1900 })
  @IsNumber()
  lon: number;

  @ApiProperty({ example: 10550 })
  @IsNumber()
  @Min(0)
  kmReading: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  gpsAccuracy: number;

  @ApiProperty({ example: '2024-01-01T09:00:00Z' })
  @IsDateString()
  timestamp: string;
}

export class CompleteDeliveryDto {
  @ApiProperty({ example: 'Customer B' })
  @IsString()
  @IsNotEmpty()
  place: string;

  @ApiProperty({ example: 10600 })
  @IsNumber()
  @Min(0)
  kmReading: number;

  @ApiPropertyOptional({ example: 50.00 })
  @IsNumber()
  @Min(0)
  labourCharges?: number;

  @ApiPropertyOptional({ example: 'Left at reception' })
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  @IsDateString()
  timestamp: string;
}

export class EndTripDto {
  @ApiProperty({ example: 10700 })
  @IsNumber()
  @Min(0)
  endingKm: number;
}
