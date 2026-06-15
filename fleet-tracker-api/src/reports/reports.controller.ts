import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import {
  CustomReportQueryDto,
  DailyReportQueryDto,
  FuelReportQueryDto,
  MonthlyReportQueryDto,
  ReportFormat,
  TripsReportQueryDto,
} from './dto/reports.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { buildCsvBuffer, buildPdfBuffer } from './report-export.util';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@Roles(UserRole.SUPER_ADMIN, UserRole.FLEET_MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Daily fleet report (ADMIN only)' })
  async daily(@Query() query: DailyReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getDailyReport(query);
    return this.sendReport(res, 'daily-report', query.format, [data], data);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly fleet report (ADMIN only)' })
  async monthly(@Query() query: MonthlyReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getMonthlyReport(query);
    const rows = data.dailyBreakdown.map((d) => ({ month: data.month, ...d }));
    return this.sendReport(res, 'monthly-report', query.format, rows, data);
  }

  @Get('custom')
  @ApiOperation({ summary: 'Custom date range report (ADMIN only)' })
  async custom(@Query() query: CustomReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getCustomReport(query);
    const rows = data.dailyBreakdown.map((d) => ({
      startDate: data.startDate,
      endDate: data.endDate,
      ...d,
    }));
    return this.sendReport(res, 'custom-report', query.format, rows, data);
  }

  @Get('fuel')
  @ApiOperation({ summary: 'Fuel consumption report (ADMIN only)' })
  async fuel(@Query() query: FuelReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getFuelReport(query);
    return this.sendReport(
      res,
      'fuel-report',
      query.format,
      data.entries,
      data,
    );
  }

  @Get('trips')
  @ApiOperation({ summary: 'Trips report (ADMIN only)' })
  async trips(@Query() query: TripsReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getTripsReport(query);
    return this.sendReport(res, 'trips-report', query.format, data.trips, data);
  }

  private async sendReport(
    res: Response,
    filename: string,
    format: ReportFormat | undefined,
    exportRows: Record<string, unknown>[],
    jsonData: unknown,
  ) {
    if (format === ReportFormat.PDF) {
      const buffer = await buildPdfBuffer(filename, exportRows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.pdf"`,
      );
      return res.send(buffer);
    }

    if (format === ReportFormat.CSV) {
      const buffer = buildCsvBuffer(exportRows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      return res.send(buffer);
    }

    return res.json({ success: true, data: jsonData });
  }
}
