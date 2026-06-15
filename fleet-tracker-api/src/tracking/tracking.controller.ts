import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { GpsUpdateDto, BatchGpsUpdateDto } from './dto/tracking.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('location')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Single GPS update (DRIVER only)' })
  async processGpsUpdate(
    @CurrentUser() user: { id: string },
    @Body() gpsUpdateDto: GpsUpdateDto,
  ) {
    return this.trackingService.processGpsUpdate(user.id, gpsUpdateDto);
  }

  @Post('location/batch')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Batch GPS update (DRIVER only)' })
  async processBatchUpdate(
    @CurrentUser() user: { id: string },
    @Body() batchGpsUpdateDto: BatchGpsUpdateDto,
  ) {
    return this.trackingService.processBatchUpdate(user.id, batchGpsUpdateDto);
  }
}
