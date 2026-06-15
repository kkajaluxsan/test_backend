import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { TrucksService } from './trucks.service';
import {
  CreateTruckDto,
  UpdateTruckDto,
  UpdateTruckStatusDto,
} from './dto/trucks.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Trucks')
@ApiBearerAuth()
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get('assigned')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get own assigned truck (DRIVER only)' })
  async getAssigned(@CurrentUser() user: any) {
    return this.trucksService.getAssigned(user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'List all trucks (ADMIN only)' })
  async findAll() {
    return this.trucksService.findAll();
  }

  @Get(':id/trips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Trip history for a truck (ADMIN only)' })
  async getTrips(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.trucksService.getTripHistory(id, query);
  }

  @Get(':id/live')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Get live position from Redis (ADMIN only)' })
  async getLivePosition(@Param('id') id: string) {
    return this.trucksService.getLivePosition(id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Get truck by id (ADMIN only)' })
  async findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Create truck (ADMIN only)' })
  async create(@Body() createTruckDto: CreateTruckDto) {
    return this.trucksService.create(createTruckDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Manually update truck status (ADMIN only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTruckStatusDto,
    @CurrentUser() user: any,
    @Req() request: Request,
  ) {
    const ipAddress =
      request.ip || request.connection.remoteAddress || 'unknown';
    return this.trucksService.updateStatus(id, dto, user.id, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Update truck (ADMIN only)' })
  async update(
    @Param('id') id: string,
    @Body() updateTruckDto: UpdateTruckDto,
  ) {
    return this.trucksService.update(id, updateTruckDto);
  }
}
