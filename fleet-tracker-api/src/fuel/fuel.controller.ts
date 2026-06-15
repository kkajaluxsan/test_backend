import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FuelService } from './fuel.service';
import {
  CreateFuelEntryDto,
  FuelKpisQueryDto,
  FuelListQueryDto,
} from './dto/fuel.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Fuel')
@ApiBearerAuth()
@Controller('fuel')
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Post()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Submit fuel or AdBlue entry (DRIVER only)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateFuelEntryDto) {
    return this.fuelService.createEntry(user.id, dto);
  }

  @Get('kpis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Fuel KPIs (ADMIN only)' })
  async kpis(@Query() query: FuelKpisQueryDto) {
    return this.fuelService.getKpis(query);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'List fuel entries (ADMIN only)' })
  async list(@Query() query: FuelListQueryDto) {
    return this.fuelService.findAll(query);
  }
}
