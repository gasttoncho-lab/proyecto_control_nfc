import { BadRequestException, Body, Controller, Headers, Logger, Post, Request, UseGuards } from '@nestjs/common';
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
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('topups')
  async topup(
    @Body() dto: TopupDto,
    @Headers('x-device-id') deviceId: string,
    @Request() req,
  ) {
    this.assertMoneyPayload(req.body);
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
    @Headers() headers: Record<string, string | string[]>,
    @Request() req,
  ) {
    this.assertMoneyPayload(req.body);
    return this.transactionsService.chargePrepare(dto, deviceId, req.user);
  }

  @Post('charges/commit')
  async chargeCommit(
    @Body() dto: ChargeCommitDto,
    @Headers('x-device-id') deviceId: string,
    @Headers() headers: Record<string, string | string[]>,
    @Request() req,
  ) {
    const traceId = this.getTraceId(headers);
    this.logger.log(`[${traceId}] CHARGE_COMMIT payload=${JSON.stringify(this.sanitizeChargePayload(req.body))}`);
    return this.transactionsService.chargeCommit(dto, deviceId, req.user, traceId);
  }

  private assertMoneyPayload(body: Record<string, unknown>) {
    if (!body) return;
    if (Object.prototype.hasOwnProperty.call(body, 'amount')) {
      this.logger.warn(`Invalid money payload, legacy amount detected: ${JSON.stringify(body)}`);
      throw new BadRequestException('Use amount_cents integer');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'amountCents')) {
      const amountCents = body.amountCents as number;
      if (!Number.isInteger(amountCents)) {
        this.logger.warn(`Invalid money payload, amountCents must be integer: ${JSON.stringify(body)}`);
        throw new BadRequestException('Use amount_cents integer');
      }
    }
  }

  private sanitizeChargePayload(body: Record<string, unknown>) {
    if (!body) return body;
    const sanitized = { ...body } as Record<string, unknown>;
    if (sanitized.sigHex) {
      sanitized.sigHex = '***';
    }
    return sanitized;
  }

  private getTraceId(headers: Record<string, string | string[]>) {
    const traceIdHeader = headers['x-trace-id'] ?? headers['x-request-id'];
    return Array.isArray(traceIdHeader) ? traceIdHeader[0] : traceIdHeader ?? 'no-trace-id';
  }

  private assertMoneyPayload(body: Record<string, unknown>) {
    if (!body) return;
    if (Object.prototype.hasOwnProperty.call(body, 'amount')) {
      this.logger.warn(`Invalid money payload, legacy amount detected: ${JSON.stringify(body)}`);
      throw new BadRequestException('Use amount_cents integer');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'amountCents')) {
      const amountCents = body.amountCents as number;
      if (!Number.isInteger(amountCents)) {
        this.logger.warn(`Invalid money payload, amountCents must be integer: ${JSON.stringify(body)}`);
        throw new BadRequestException('Use amount_cents integer');
      }
    }
  }
}
