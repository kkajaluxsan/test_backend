import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TruckStatus } from '../../common/enums';

export class CreateTruckDto {
  @ApiProperty({ example: 'MI-234AB' })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiPropertyOptional({ example: 'TRL-001' })
  @IsString()
  @IsOptional()
  trailerNumber?: string;
}

export class UpdateTruckStatusDto {
  @ApiProperty({ enum: TruckStatus, example: TruckStatus.ACTIVE })
  @IsEnum(TruckStatus)
  status: TruckStatus;
}

export class UpdateTruckDto {
  @ApiPropertyOptional({ example: 'MI-234AB' })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'TRL-001' })
  @IsString()
  @IsOptional()
  trailerNumber?: string;

  @ApiPropertyOptional({ enum: TruckStatus, example: TruckStatus.ACTIVE })
  @IsEnum(TruckStatus)
  @IsOptional()
  status?: TruckStatus;
}
