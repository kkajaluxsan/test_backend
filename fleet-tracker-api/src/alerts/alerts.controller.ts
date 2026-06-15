import { Controller, Get, Patch, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AlertsService } from './alerts.service';
import { AlertListQueryDto } from './dto/alerts.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'List alerts (ADMIN only)' })
  async list(@Query() query: AlertListQueryDto) {
    return this.alertsService.list(query);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
  @ApiOperation({ summary: 'Resolve alert (ADMIN only)' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() request: Request,
  ) {
    const ipAddress =
      request.ip || request.connection.remoteAddress || 'unknown';
    return this.alertsService.resolve(id, user.id, ipAddress);
  }
}
