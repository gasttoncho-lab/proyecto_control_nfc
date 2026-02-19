import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminInvalidateDto } from './dto/admin-invalidate.dto';
import { AdminResyncDto } from './dto/admin-resync.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';
import { TransactionStatus } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TransactionsAdminController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('events/:eventId/incidents')
  async listIncidents(@Param('eventId', new ParseUUIDPipe()) eventId: string, @Query() query: ListIncidentsDto) {
    return this.transactionsService.listCtrIncidents(eventId, {
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
      wristbandId: query.wristbandId,
      code: query.code,
      status: query.status as TransactionStatus | undefined,
    });
  }

  @Post('wristbands/:wristbandId/resync')
  async resync(
    @Param('wristbandId', new ParseUUIDPipe()) wristbandId: string,
    @Body() dto: AdminResyncDto,
    @Request() req,
  ) {
    return this.transactionsService.adminResync(wristbandId, dto, req.user);
  }

  @Post('wristbands/:wristbandId/invalidate')
  async invalidate(
    @Param('wristbandId', new ParseUUIDPipe()) wristbandId: string,
    @Body() dto: AdminInvalidateDto,
    @Request() req,
  ) {
    return this.transactionsService.adminInvalidate(wristbandId, dto, req.user);
  }
}
