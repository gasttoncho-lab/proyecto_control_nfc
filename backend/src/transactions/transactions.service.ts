import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DeviceMode } from '../devices/entities/device-authorization.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { DevicesService } from '../devices/devices.service';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband, WristbandStatus } from '../wristbands/entities/wristband.entity';
import { calculateSignature, ctrToBuffer, timingSafeEqualHex, uuidToBytes } from '../wristbands/wristband-crypto';
import { BalanceCheckDto } from './dto/balance-check.dto';
import { ChargeCommitDto } from './dto/charge-commit.dto';
import { ChargePrepareDto } from './dto/charge-prepare.dto';
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
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly devicesService: DevicesService,
  ) {}

  async topup(dto: TopupDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, user);
    if (dto.eventId && dto.eventId !== device.eventId) {
      throw new ConflictException('DEVICE_EVENT_MISMATCH');
    }
    const payload = this.buildPayload('TOPUP', dto, device.eventId);
    const existing = await this.findTransaction(device.eventId, dto.transactionId);
    if (existing) {
      return this.handleIdempotent(existing, payload);
    }

    const { wristband, wallet, event } = await this.validateRequest(device.eventId, dto.uidHex, dto.tagIdHex, dto.ctr, dto.sigHex);

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

  async balanceCheck(dto: BalanceCheckDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, user);
    if (dto.eventId && dto.eventId !== device.eventId) {
      throw new ConflictException('DEVICE_EVENT_MISMATCH');
    }
    const payload = this.buildPayload('BALANCE_CHECK', dto, device.eventId);
    const existing = await this.findTransaction(device.eventId, dto.transactionId);
    if (existing) {
      return this.handleIdempotent(existing, payload);
    }

    const { wristband, wallet, event } = await this.validateRequest(device.eventId, dto.uidHex, dto.tagIdHex, dto.ctr, dto.sigHex);

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

  async chargePrepare(dto: ChargePrepareDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, user);
    if (device.mode !== DeviceMode.CHARGE) {
      throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }
    if (!device.boothId) {
      throw new UnprocessableEntityException('BOOTH_NOT_ASSIGNED');
    }

    const payload = this.buildChargePayload(dto, device.eventId, device.boothId, user.id, deviceId);
    const existing = await this.findTransaction(device.eventId, dto.transactionId);
    if (existing) {
      return this.handleIdempotent(existing, payload);
    }

    const { wristband, wallet, event } = await this.validateRequest(device.eventId, dto.uidHex, dto.tagIdHex, dto.ctr, dto.sigHex);
    const { items, totalCents } = await this.resolveChargeItems(device.eventId, dto.items);

    if (wallet.balanceCents < totalCents) {
      const response = {
        status: TransactionStatus.DECLINED,
        totalCents,
        reason: 'INSUFFICIENT_FUNDS',
      };
      await this.transactionsRepository.save({
        id: dto.transactionId,
        eventId: event.id,
        wristbandId: wristband.id,
        type: TransactionType.CHARGE,
        status: TransactionStatus.DECLINED,
        amountCents: totalCents,
        payloadJson: { ...payload, items },
        resultJson: response,
        operatorUserId: user.id,
        deviceId,
        boothId: device.boothId,
      });
      return response;
    }

    const ctrNew = dto.ctr + 1;
    const sigNewHex = this.calculateSigHex(event.hmacSecret, dto.uidHex, dto.tagIdHex, ctrNew, event.id);
    const expiresAt = new Date(Date.now() + 60_000);
    const response = {
      status: TransactionStatus.PENDING,
      totalCents,
      ctrNew,
      sigNewHex,
      expiresAt: expiresAt.toISOString(),
    };

    await this.transactionsRepository.save({
      id: dto.transactionId,
      eventId: event.id,
      wristbandId: wristband.id,
      type: TransactionType.CHARGE,
      status: TransactionStatus.PENDING,
      amountCents: totalCents,
      payloadJson: { ...payload, items },
      resultJson: response,
      operatorUserId: user.id,
      deviceId,
      boothId: device.boothId,
    });

    return response;
  }

  async chargeCommit(dto: ChargeCommitDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, user);
    if (device.mode !== DeviceMode.CHARGE) {
      throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }
    if (!device.boothId) {
      throw new UnprocessableEntityException('BOOTH_NOT_ASSIGNED');
    }

    const transaction = await this.findTransaction(device.eventId, dto.transactionId);
    if (!transaction) {
      throw new ConflictException('TX_CONFLICT');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      return transaction.resultJson;
    }

    const pendingResult = transaction.resultJson as {
      status: string;
      totalCents: number;
      ctrNew: number;
      sigNewHex: string;
      expiresAt?: string;
    };

    if (pendingResult.expiresAt && new Date(pendingResult.expiresAt).getTime() < Date.now()) {
      const declined = { status: TransactionStatus.DECLINED, totalCents: transaction.amountCents, reason: 'TX_CONFLICT' };
      transaction.status = TransactionStatus.DECLINED;
      transaction.resultJson = declined;
      await this.transactionsRepository.save(transaction);
      return declined;
    }

    const wallet = await this.walletsRepository.findOne({ where: { eventId: device.eventId, wristbandId: transaction.wristbandId } });
    const wristband = await this.wristbandsRepository.findOne({ where: { id: transaction.wristbandId } });
    if (!wallet || !wristband) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }

    if (wallet.balanceCents < transaction.amountCents) {
      const declined = { status: TransactionStatus.DECLINED, totalCents: transaction.amountCents, reason: 'INSUFFICIENT_FUNDS' };
      transaction.status = TransactionStatus.DECLINED;
      transaction.resultJson = declined;
      await this.transactionsRepository.save(transaction);
      return declined;
    }

    const response = { status: TransactionStatus.APPROVED, totalCents: transaction.amountCents };

    await this.dataSource.transaction(async (manager) => {
      wallet.balanceCents -= transaction.amountCents;
      await manager.save(Wallet, wallet);

      wristband.ctrCurrent = pendingResult.ctrNew;
      await manager.save(Wristband, wristband);

      transaction.status = TransactionStatus.APPROVED;
      transaction.resultJson = response;
      transaction.operatorUserId = user.id;
      transaction.deviceId = deviceId;
      transaction.boothId = device.boothId;
      await manager.save(Transaction, transaction);
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
      throw new ConflictException('TX_CONFLICT');
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
      throw new UnprocessableEntityException('EVENT_CLOSED');
    }

    const wristband = await this.wristbandsRepository.findOne({ where: { eventId, uidHex: uidHex.toLowerCase() } });
    if (!wristband) {
      throw new NotFoundException('Wristband not found');
    }
    if (wristband.status !== WristbandStatus.ACTIVE) {
      this.logger.warn(`Wristband blocked eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('WRISTBAND_BLOCKED');
    }
    if (wristband.tagIdHex !== tagIdHex.toLowerCase()) {
      this.logger.warn(`Tag mismatch eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('CTR_TAMPER');
    }

    if (wristband.ctrCurrent !== ctr) {
      this.logger.warn(`Invalid ctr eventId=${eventId} wristbandId=${wristband.id} expected=${wristband.ctrCurrent} got=${ctr}`);
      throw new UnprocessableEntityException('CTR_REPLAY');
    }

    const expectedSig = this.calculateSigHex(event.hmacSecret, uidHex, tagIdHex, ctr, eventId);
    if (!timingSafeEqualHex(expectedSig, sigHex.toLowerCase())) {
      this.logger.warn(`Invalid signature eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('INVALID_SIGNATURE');
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

  private buildPayload(type: 'TOPUP' | 'BALANCE_CHECK', dto: TopupDto | BalanceCheckDto, eventId: string) {
    return type === 'TOPUP'
      ? {
          type,
          transactionId: dto.transactionId,
          eventId,
          uidHex: dto.uidHex.toLowerCase(),
          tagIdHex: dto.tagIdHex.toLowerCase(),
          ctr: dto.ctr,
          sigHex: dto.sigHex.toLowerCase(),
          amountCents: (dto as TopupDto).amountCents,
        }
      : {
          type,
          transactionId: dto.transactionId,
          eventId,
          uidHex: dto.uidHex.toLowerCase(),
          tagIdHex: dto.tagIdHex.toLowerCase(),
          ctr: dto.ctr,
          sigHex: dto.sigHex.toLowerCase(),
        };
  }

  private buildChargePayload(
    dto: ChargePrepareDto,
    eventId: string,
    boothId: string,
    operatorUserId: string,
    deviceId: string,
  ) {
    return {
      type: TransactionType.CHARGE,
      transactionId: dto.transactionId,
      eventId,
      boothId,
      operatorUserId,
      deviceId,
      uidHex: dto.uidHex.toLowerCase(),
      tagIdHex: dto.tagIdHex.toLowerCase(),
      ctr: dto.ctr,
      sigHex: dto.sigHex.toLowerCase(),
      items: dto.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    };
  }

  private async resolveChargeItems(eventId: string, items: { productId: string; qty: number }[]) {
    const productIds = items.map((item) => item.productId);
    const products = await this.productsRepository.find({ where: { id: In(productIds), eventId, status: ProductStatus.ACTIVE } });
    if (products.length !== productIds.length) {
      throw new UnprocessableEntityException('INVALID_PRODUCT');
    }

    const totalCents = items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new UnprocessableEntityException('INVALID_PRODUCT');
      }
      return total + product.priceCents * item.qty;
    }, 0);

    return {
      items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
      totalCents,
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
