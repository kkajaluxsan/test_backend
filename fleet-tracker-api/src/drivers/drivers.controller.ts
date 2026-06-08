import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { UpdateDriverDto, AssignTruckDto } from './dto/drivers.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get own driver profile (DRIVER only)' })
  async getMe(@CurrentUser() user: any) {
    return this.driversService.getMe(user.id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'List all drivers (ADMIN only)' })
  async findAll() {
    return this.driversService.findAll();
  }

  @Get(':id/trips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Trip history for a driver (ADMIN only)' })
  async getTrips(@Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.driversService.getTripHistory(id, query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Get driver by id (ADMIN only)' })
  async findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Update driver (ADMIN only)' })
  async update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Post(':id/assign-truck')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Assign truck to driver (ADMIN only)' })
  async assignTruck(@Param('id') id: string, @Body() assignTruckDto: AssignTruckDto) {
    return this.driversService.assignTruck(id, assignTruckDto);
  }
}
