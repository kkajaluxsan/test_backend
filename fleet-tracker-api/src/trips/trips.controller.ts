import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import {
  StartTripDto,
  AddStopsDto,
  ConfirmLoadDto,
  CompleteDeliveryDto,
  EndTripDto,
} from './dto/trips.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Start Day (DRIVER only)' })
  async startTrip(
    @CurrentUser() user: any,
    @Body() startTripDto: StartTripDto,
  ) {
    return this.tripsService.startTrip(user.id, startTripDto);
  }

  @Post(':id/stops')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Add planned stops (DRIVER only)' })
  async addStops(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() addStopsDto: AddStopsDto,
  ) {
    return this.tripsService.addStops(user.id, id, addStopsDto);
  }

  @Patch(':id/stops/:stopId/confirm')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Confirm load pickup (DRIVER only)' })
  async confirmLoad(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @Body() confirmLoadDto: ConfirmLoadDto,
  ) {
    return this.tripsService.confirmLoad(user.id, id, stopId, confirmLoadDto);
  }

  @Patch(':id/stops/:stopId/deliver')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Complete delivery (DRIVER only)' })
  async completeDelivery(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @Body() completeDeliveryDto: CompleteDeliveryDto,
  ) {
    return this.tripsService.completeDelivery(
      user.id,
      id,
      stopId,
      completeDeliveryDto,
    );
  }

  @Patch(':id/end')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'End Day (DRIVER only)' })
  async endTrip(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() endTripDto: EndTripDto,
  ) {
    return this.tripsService.endTrip(user.id, id, endTripDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'List trips (ADMIN only)' })
  async findAll(@Query() query: any) {
    return this.tripsService.findAll(query);
  }

  @Get(':id/route')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Full GPS route for a trip (ADMIN only)' })
  async getRoute(@Param('id') id: string) {
    return this.tripsService.getRoute(id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Trip detail (ADMIN only)' })
  async findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }
}
