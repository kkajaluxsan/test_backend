import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@truckyitalia.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DRIVER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ example: 'Marco Rossi', description: 'Required when role is DRIVER' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  driverName?: string;

  @ApiPropertyOptional({ example: 'AB1234567', description: 'Required when role is DRIVER' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '+39 333 1234567', description: 'Required when role is DRIVER' })
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsString()
  @IsNotEmpty()
  phone?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'updated@truckyitalia.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.DRIVER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
