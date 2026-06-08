import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Mario Rossi' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'IT-123456789' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '+393331234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class AssignTruckDto {
  @ApiProperty({ example: 'uuid-of-truck' })
  @IsUUID()
  @IsNotEmpty()
  truckId: string;
}
