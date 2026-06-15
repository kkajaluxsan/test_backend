import {
  IsNumber,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsArray,
  IsString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GpsUpdateDto {
  @ApiProperty({ example: 'uuid-of-truck' })
  @IsUUID()
  @IsNotEmpty()
  truckId: string;

  @ApiProperty({ example: 'uuid-of-trip' })
  @IsUUID()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({ example: 45.4642 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 9.19 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;

  @ApiProperty({ example: 80.5 })
  @IsNumber()
  @IsNotEmpty()
  speed: number;

  @ApiProperty({ example: 120.5 })
  @IsNumber()
  @IsNotEmpty()
  heading: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  @IsNotEmpty()
  accuracy: number;

  @ApiPropertyOptional({ example: 150.0 })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  @IsDateString()
  timestamp: string;
}

export class BatchGpsUpdateDto {
  @ApiProperty({ type: [GpsUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsUpdateDto)
  positions: GpsUpdateDto[];
}
