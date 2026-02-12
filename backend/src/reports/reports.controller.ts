import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListReportTransactionsDto } from './dto/list-report-transactions.dto';
import { ReportByProductDto } from './dto/report-by-product.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('events/:eventId/summary')
  async getSummary(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.reportsService.getEventSummary(eventId);
  }

  @Get('events/:eventId/by-booth')
  async getByBooth(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.reportsService.getByBooth(eventId);
  }

  @Get('events/:eventId/transactions')
  async getTransactions(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query() query: ListReportTransactionsDto,
  ) {
    return this.reportsService.getTransactions(eventId, query);
  }

  @Get('events/:eventId/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Disposition', `attachment; filename="report-event-${eventId}.csv"`);
    return this.reportsService.exportApprovedCsv(eventId);
  }

  @Get('events/:eventId/by-product')
  async getByProduct(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query() query: ReportByProductDto,
  ) {
    return this.reportsService.getByProduct(eventId, query);
  }

  @Get('events/:eventId/export-products.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportProductsCsv(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Query() query: ReportByProductDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Disposition', `attachment; filename="report-products-event-${eventId}.csv"`);
    return this.reportsService.exportProductsCsv(eventId, query);
  }
}
