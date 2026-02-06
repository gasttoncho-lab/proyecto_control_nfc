import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Event, EventStatus } from '../events/entities/event.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband, WristbandStatus } from '../wristbands/entities/wristband.entity';
import { calculateSignature, ctrToBuffer, timingSafeEqualHex, uuidToBytes } from '../wristbands/wristband-crypto';
import { BalanceCheckDto } from './dto/balance-check.dto';
import { TopupDto } from './dto/topup.dto';
import { Transaction, TransactionStatus, TransactionType } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Wristband)
    private readonly wristbandsRepository: Repository<Wristband>,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async topup(dto: TopupDto) {
    const payload = this.buildPayload('TOPUP', dto);
    const existing = await this.findTransaction(dto.eventId, dto.transactionId);
    if (existing) {
      return this.handleIdempotent(existing, payload);
    }

    const { wristband, wallet, event } = await this.validateRequest(dto.eventId, dto.uidHex, dto.tagIdHex, dto.ctr, dto.sigHex);

    const result = await this.dataSource.transaction(async (manager) => {
      wallet.balanceCents += dto.amountCents;
      const savedWallet = await manager.save(Wallet, wallet);
      const response = {
        status: TransactionStatus.APPROVED,
        balanceCents: savedWallet.balanceCents,
      };

      const transaction = manager.create(Transaction, {
        id: dto.transactionId,
        eventId: event.id,
        wristbandId: wristband.id,
        type: TransactionType.TOPUP,
        status: TransactionStatus.APPROVED,
        amountCents: dto.amountCents,
        payloadJson: payload,
        resultJson: response,
      });
      await manager.save(Transaction, transaction);

      return response;
    });

    return result;
  }

  async balanceCheck(dto: BalanceCheckDto) {
    const payload = this.buildPayload('BALANCE_CHECK', dto);
    const existing = await this.findTransaction(dto.eventId, dto.transactionId);
    if (existing) {
      return this.handleIdempotent(existing, payload);
    }

    const { wristband, wallet, event } = await this.validateRequest(dto.eventId, dto.uidHex, dto.tagIdHex, dto.ctr, dto.sigHex);

    const response = {
      status: TransactionStatus.APPROVED,
      balanceCents: wallet.balanceCents,
      wristbandStatus: wristband.status,
    };

    await this.transactionsRepository.save({
      id: dto.transactionId,
      eventId: event.id,
      wristbandId: wristband.id,
      type: TransactionType.BALANCE_CHECK,
      status: TransactionStatus.APPROVED,
      amountCents: 0,
      payloadJson: payload,
      resultJson: response,
    });

    return response;
  }

  private async findTransaction(eventId: string, transactionId: string) {
    return this.transactionsRepository.findOne({ where: { id: transactionId, eventId } });
  }

  private handleIdempotent(transaction: Transaction, payload: Record<string, unknown>) {
    const existingPayload = this.stableStringify(transaction.payloadJson);
    const incomingPayload = this.stableStringify(payload);
    if (existingPayload !== incomingPayload) {
      throw new ConflictException('Transaction already exists with different payload');
    }
    return transaction.resultJson;
  }

  private async validateRequest(eventId: string, uidHex: string, tagIdHex: string, ctr: number, sigHex: string) {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.status !== EventStatus.OPEN) {
      this.logger.warn(`Event closed eventId=${eventId}`);
      throw new UnprocessableEntityException('Event is closed');
    }

    const wristband = await this.wristbandsRepository.findOne({ where: { eventId, uidHex: uidHex.toLowerCase() } });
    if (!wristband) {
      throw new NotFoundException('Wristband not found');
    }
    if (wristband.status !== WristbandStatus.ACTIVE) {
      this.logger.warn(`Wristband blocked eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('Wristband is blocked');
    }
    if (wristband.tagIdHex !== tagIdHex.toLowerCase()) {
      this.logger.warn(`Tag mismatch eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('Tag mismatch');
    }

    if (wristband.ctrCurrent !== ctr) {
      this.logger.warn(`Invalid ctr eventId=${eventId} wristbandId=${wristband.id} expected=${wristband.ctrCurrent} got=${ctr}`);
      throw new UnprocessableEntityException('Invalid counter');
    }

    const expectedSig = this.calculateSigHex(event.hmacSecret, uidHex, tagIdHex, ctr, eventId);
    if (!timingSafeEqualHex(expectedSig, sigHex.toLowerCase())) {
      this.logger.warn(`Invalid signature eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('Invalid signature');
    }

    const wallet = await this.walletsRepository.findOne({ where: { eventId, wristbandId: wristband.id } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return { event, wristband, wallet };
  }

  private calculateSigHex(secret: string | Buffer, uidHex: string, tagIdHex: string, ctr: number, eventId: string) {
    const uidBytes = Buffer.from(uidHex, 'hex');
    const tagIdBytes = Buffer.from(tagIdHex, 'hex');
    const ctrBytes = ctrToBuffer(ctr);
    const eventIdBytes = uuidToBytes(eventId);
    const msg = Buffer.concat([uidBytes, tagIdBytes, ctrBytes, eventIdBytes]);
    return calculateSignature(secret, msg).toString('hex');
  }

  private buildPayload(type: 'TOPUP' | 'BALANCE_CHECK', dto: TopupDto | BalanceCheckDto) {
    return type === 'TOPUP'
      ? {
          type,
          transactionId: dto.transactionId,
          eventId: dto.eventId,
          uidHex: dto.uidHex.toLowerCase(),
          tagIdHex: dto.tagIdHex.toLowerCase(),
          ctr: dto.ctr,
          sigHex: dto.sigHex.toLowerCase(),
          amountCents: (dto as TopupDto).amountCents,
        }
      : {
          type,
          transactionId: dto.transactionId,
          eventId: dto.eventId,
          uidHex: dto.uidHex.toLowerCase(),
          tagIdHex: dto.tagIdHex.toLowerCase(),
          ctr: dto.ctr,
          sigHex: dto.sigHex.toLowerCase(),
        };
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>).sort();
      const entries = keys.map((key) => `"${key}":${this.stableStringify((value as Record<string, unknown>)[key])}`);
      return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
