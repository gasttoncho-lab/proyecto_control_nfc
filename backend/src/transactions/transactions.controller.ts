import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { BalanceCheckDto } from './dto/balance-check.dto';
import { TopupDto } from './dto/topup.dto';
import { TransactionsService } from './transactions.service';

@Controller()
@UseGuards(JwtAuthGuard, AdminGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('topups')
  async topup(
    @Body() dto: TopupDto,
    @Headers('x-device-id') deviceId: string,
    @Request() req,
  ) {
    return this.transactionsService.topup(dto, deviceId, req.user);
  }

  @Post('balance-check')
  async balanceCheck(
    @Body() dto: BalanceCheckDto,
    @Headers('x-device-id') deviceId: string,
    @Request() req,
  ) {
    return this.transactionsService.balanceCheck(dto, deviceId, req.user);
  }
}
