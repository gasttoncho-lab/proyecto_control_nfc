import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminInvalidateDto } from './dto/admin-invalidate.dto';
import { AdminRefundDto } from './dto/admin-refund.dto';
import { AdminReplaceDto } from './dto/admin-replace.dto';
import { AdminResyncDto } from './dto/admin-resync.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';
import { ListAdminActionsDto } from './dto/list-admin-actions.dto';
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

  @Get('wristbands/:wristbandId')
  async getWristbandState(@Param('wristbandId', new ParseUUIDPipe()) wristbandId: string) {
    return this.transactionsService.getAdminWristbandState(wristbandId);
  }

  @Post('wristbands/:oldWristbandId/replace')
  async replaceWristband(
    @Param('oldWristbandId', new ParseUUIDPipe()) oldWristbandId: string,
    @Body() dto: AdminReplaceDto,
    @Request() req,
  ) {
    return this.transactionsService.adminReplaceWristband(oldWristbandId, dto, req.user);
  }

  @Get('events/:eventId/admin-actions')
  async listAdminActions(@Param('eventId', new ParseUUIDPipe()) eventId: string, @Query() query: ListAdminActionsDto) {
    return this.transactionsService.listAdminActions(eventId, {
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
      wristbandId: query.wristbandId,
    });
  }

  @Post('transactions/:transactionId/refund')
  async refundTransaction(
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() dto: AdminRefundDto,
    @Request() req,
  ) {
    return this.transactionsService.adminRefund(transactionId, dto, req.user);
  }
}
