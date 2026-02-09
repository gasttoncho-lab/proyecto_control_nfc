import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { BalanceCheckDto } from './dto/balance-check.dto';
import { ChargeCommitDto } from './dto/charge-commit.dto';
import { ChargePrepareDto } from './dto/charge-prepare.dto';
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

  @Post('charges/prepare')
  async chargePrepare(
    @Body() dto: ChargePrepareDto,
    @Headers('x-device-id') deviceId: string,
    @Request() req,
  ) {
    return this.transactionsService.chargePrepare(dto, deviceId, req.user);
  }

  @Post('charges/commit')
  async chargeCommit(
    @Body() dto: ChargeCommitDto,
    @Headers('x-device-id') deviceId: string,
    @Request() req,
  ) {
    return this.transactionsService.chargeCommit(dto, deviceId, req.user);
  }
}
