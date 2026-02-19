import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
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
import { CtrValidationResult, validateCtr } from './ctr-validation';
import { TransactionItem } from './entities/transaction-item.entity';
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

    let validated;
    try {
      validated = await this.validateRequest(
        device.eventId,
        dto.uidHex,
        dto.tagIdHex,
        dto.ctr,
        dto.sigHex,
        deviceId,
        dto.transactionId,
      );
    } catch (error) {
      await this.persistCtrIncidentIfNeeded(TransactionType.TOPUP, device.eventId, payload, dto.transactionId, error);
      throw error;
    }
    const { wristband, wallet, event } = validated;

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

    let validated;
    try {
      validated = await this.validateRequest(
        device.eventId,
        dto.uidHex,
        dto.tagIdHex,
        dto.ctr,
        dto.sigHex,
        deviceId,
        dto.transactionId,
      );
    } catch (error) {
      await this.persistCtrIncidentIfNeeded(TransactionType.BALANCE_CHECK, device.eventId, payload, dto.transactionId, error);
      throw error;
    }
    const { wristband, wallet, event } = validated;

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

    let validated;
    try {
      validated = await this.validateRequest(
        device.eventId,
        dto.uidHex,
        dto.tagIdHex,
        dto.ctr,
        dto.sigHex,
        deviceId,
        dto.transactionId,
      );
    } catch (error) {
      await this.persistCtrIncidentIfNeeded(TransactionType.CHARGE, device.eventId, payload, dto.transactionId, error);
      throw error;
    }
    const { wristband, wallet, event } = validated;
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
    if (wristband.status !== WristbandStatus.ACTIVE) {
      throw new UnprocessableEntityException({
        message: 'WRISTBAND_INVALIDATED',
        code: 'WRISTBAND_INVALIDATED',
        reason: 'WRISTBAND_INVALIDATED',
      });
    }

    if (wallet.balanceCents < transaction.amountCents) {
      const declined = { status: TransactionStatus.DECLINED, totalCents: transaction.amountCents, reason: 'INSUFFICIENT_FUNDS' };
      transaction.status = TransactionStatus.DECLINED;
      transaction.resultJson = declined;
      await this.transactionsRepository.save(transaction);
      return declined;
    }

    const response = { status: TransactionStatus.APPROVED, totalCents: transaction.amountCents };

    const payloadItems = this.extractPayloadItems(transaction.payloadJson);
    const resolvedItems = await this.resolveChargeItemsForCommit(device.eventId, payloadItems);
    const computedTotal = resolvedItems.reduce((total, item) => total + item.lineTotalCents, 0);
    if (computedTotal !== transaction.amountCents) {
      this.logger.error(
        `CHARGE_TOTAL_MISMATCH eventId=${device.eventId} transactionId=${transaction.id} amountCents=${transaction.amountCents} computed=${computedTotal}`,
      );
      const declined = { status: TransactionStatus.DECLINED, totalCents: transaction.amountCents, reason: 'TX_CONFLICT' };
      transaction.status = TransactionStatus.DECLINED;
      transaction.resultJson = declined;
      await this.transactionsRepository.save(transaction);
      return declined;
    }

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

      const existingItems = await manager.count(TransactionItem, {
        where: { eventId: device.eventId, transactionId: transaction.id },
      });
      if (existingItems === 0) {
        const itemsToSave = resolvedItems.map((item) =>
          manager.create(TransactionItem, {
            eventId: device.eventId,
            transactionId: transaction.id,
            boothId: device.boothId,
            productId: item.productId,
            qty: item.qty,
            priceCents: item.priceCents,
            lineTotalCents: item.lineTotalCents,
          }),
        );
        await manager.save(TransactionItem, itemsToSave);
      }
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

  private async validateRequest(
    eventId: string,
    uidHex: string,
    tagIdHex: string,
    ctr: number,
    sigHex: string,
    deviceId?: string,
    transactionId?: string,
  ) {
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
      throw new UnprocessableEntityException({
        message: 'WRISTBAND_INVALIDATED',
        code: 'WRISTBAND_INVALIDATED',
        reason: 'WRISTBAND_INVALIDATED',
      });
    }
    if (wristband.tagIdHex !== tagIdHex.toLowerCase()) {
      this.logger.warn(`Tag mismatch eventId=${eventId} wristbandId=${wristband.id}`);
      throw new UnprocessableEntityException('CTR_TAMPER');
    }

    const ctrValidation = validateCtr(wristband.ctrCurrent, ctr);
    if (ctrValidation !== CtrValidationResult.OK) {
      if (ctrValidation === CtrValidationResult.CTR_FORWARD_JUMP) {
        const expectedSig = this.calculateSigHex(event.hmacSecret, uidHex, tagIdHex, ctr, eventId);
        if (timingSafeEqualHex(expectedSig, sigHex.toLowerCase())) {
          const serverCtrBefore = wristband.ctrCurrent;
          wristband.ctrCurrent = ctr;
          await this.wristbandsRepository.save(wristband);
          this.logger.warn(
            `CTR_RESYNC_DONE eventId=${eventId} wristbandId=${wristband.id} serverCtrBefore=${serverCtrBefore} tagCtr=${ctr} deviceId=${deviceId ?? 'unknown'} transactionId=${transactionId ?? 'unknown'}`,
          );
          throw new UnprocessableEntityException({
            message: 'CTR_RESYNC_DONE_RETRY',
            code: 'CTR_RESYNC_DONE_RETRY',
            reason: 'CTR_FORWARD_JUMP',
            eventId,
            wristbandId: wristband.id,
            deviceId,
            transactionId,
            gotCtr: ctr,
            serverCtr: serverCtrBefore,
            expectedCtr: serverCtrBefore,
            tagCtr: ctr,
          });
        }
      }

      this.logger.warn(
        `Invalid ctr eventId=${eventId} wristbandId=${wristband.id} serverCtrCurrent=${wristband.ctrCurrent} expected=${wristband.ctrCurrent} got=${ctr}`,
      );
      this.buildCtrException(ctrValidation, {
        eventId,
        wristbandId: wristband.id,
        deviceId,
        transactionId,
        gotCtr: ctr,
        serverCtr: wristband.ctrCurrent,
        expectedCtr: wristband.ctrCurrent,
        tagCtr: ctr,
      });
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

  private buildCtrException(code: CtrValidationResult, metadata: Record<string, unknown>): never {
    throw new UnprocessableEntityException({
      message: code,
      code,
      reason: code,
      ...metadata,
    });
  }

  async listCtrIncidents(
    eventId: string,
    query: { from?: string; to?: string; page?: number; limit?: number; wristbandId?: string; code?: string; status?: TransactionStatus },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.transactionsRepository.createQueryBuilder('tx').where('tx.eventId = :eventId', { eventId });
    qb.andWhere("JSON_UNQUOTE(JSON_EXTRACT(tx.resultJson, '$.code')) LIKE :codeLike", {
      codeLike: query.code ? query.code : 'CTR_%',
    });

    if (query.status) qb.andWhere('tx.status = :status', { status: query.status });
    if (query.wristbandId) qb.andWhere('tx.wristbandId = :wristbandId', { wristbandId: query.wristbandId });
    if (query.from) qb.andWhere('tx.createdAt >= :from', { from: new Date(query.from).toISOString() });
    if (query.to) qb.andWhere('tx.createdAt <= :to', { to: new Date(query.to).toISOString() });

    qb.orderBy('tx.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async adminResync(
    wristbandId: string,
    dto: { eventId: string; targetCtr: number; reason?: string; deviceId?: string },
    user: { id: string },
  ) {
    const wristband = await this.wristbandsRepository.findOne({ where: { id: wristbandId, eventId: dto.eventId } });
    if (!wristband) throw new NotFoundException('Wristband not found');
    if (dto.targetCtr < wristband.ctrCurrent) throw new ConflictException('CTR_CANNOT_DECREASE');

    const fromCtr = wristband.ctrCurrent;
    wristband.ctrCurrent = dto.targetCtr;
    await this.wristbandsRepository.save(wristband);

    const auditId = randomUUID();
    await this.transactionsRepository.save({
      id: auditId,
      eventId: dto.eventId,
      wristbandId: wristband.id,
      type: TransactionType.BALANCE_CHECK,
      status: TransactionStatus.APPROVED,
      amountCents: 0,
      payloadJson: { eventId: dto.eventId, wristbandId, targetCtr: dto.targetCtr, reason: dto.reason ?? null },
      resultJson: { code: 'ADMIN_RESYNC', fromCtr, toCtr: dto.targetCtr, byUserId: user.id, deviceId: dto.deviceId ?? null },
      operatorUserId: user.id,
      deviceId: dto.deviceId ?? null,
    });

    return { status: 'OK', code: 'ADMIN_RESYNC', fromCtr, toCtr: dto.targetCtr };
  }

  async adminInvalidate(wristbandId: string, dto: { eventId: string; reason?: string }, user: { id: string }) {
    const wristband = await this.wristbandsRepository.findOne({ where: { id: wristbandId, eventId: dto.eventId } });
    if (!wristband) throw new NotFoundException('Wristband not found');

    wristband.status = WristbandStatus.INVALIDATED;
    await this.wristbandsRepository.save(wristband);

    const auditId = randomUUID();
    await this.transactionsRepository.save({
      id: auditId,
      eventId: dto.eventId,
      wristbandId: wristband.id,
      type: TransactionType.BALANCE_CHECK,
      status: TransactionStatus.APPROVED,
      amountCents: 0,
      payloadJson: { eventId: dto.eventId, wristbandId, reason: dto.reason ?? null },
      resultJson: { code: 'ADMIN_INVALIDATE', reason: dto.reason ?? null, byUserId: user.id },
      operatorUserId: user.id,
    });

    return { status: 'OK', code: 'ADMIN_INVALIDATE', wristbandId };
  }

  private async persistCtrIncidentIfNeeded(
    type: TransactionType,
    eventId: string,
    payload: Record<string, unknown>,
    transactionId: string,
    error: unknown,
  ) {
    if (!(error instanceof UnprocessableEntityException)) {
      return;
    }

    const response = error.getResponse() as Record<string, unknown>;
    const code = typeof response?.code === 'string' ? response.code : undefined;
    if (!code || !['CTR_REPLAY', 'CTR_FORWARD_JUMP', 'CTR_RESYNC_DONE_RETRY'].includes(code)) {
      return;
    }

    const wristbandId = typeof response.wristbandId === 'string' ? response.wristbandId : undefined;
    if (!wristbandId) {
      return;
    }

    await this.transactionsRepository.save({
      id: transactionId,
      eventId,
      wristbandId,
      type,
      status: TransactionStatus.DECLINED,
      amountCents: 0,
      payloadJson: {
        eventId,
        wristbandId,
        deviceId: payload.deviceId ?? response.deviceId ?? null,
        transactionId,
        gotCtr: payload.ctr ?? response.gotCtr ?? null,
      },
      resultJson: {
        code,
        reason: response.reason ?? code,
        message: response.message ?? code,
        serverCtr: response.serverCtr ?? null,
        expectedCtr: response.expectedCtr ?? null,
        tagCtr: response.tagCtr ?? payload.ctr ?? null,
      },
      deviceId: (payload.deviceId as string | undefined) ?? null,
    });
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
    const aggregated = this.aggregateChargeItems(items);
    const productIds = aggregated.map((item) => item.productId);
    const products = await this.productsRepository.find({ where: { id: In(productIds), eventId, status: ProductStatus.ACTIVE } });
    if (products.length !== productIds.length) {
      throw new UnprocessableEntityException('INVALID_PRODUCT');
    }

    const totalCents = aggregated.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new UnprocessableEntityException('INVALID_PRODUCT');
      }
      return total + product.priceCents * item.qty;
    }, 0);

    return {
      items: aggregated.map((item) => ({ productId: item.productId, qty: item.qty })),
      totalCents,
    };
  }

  private extractPayloadItems(payload: Record<string, unknown>) {
    const rawItems = payload?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new ConflictException('TX_CONFLICT');
    }

    const parsedItems = rawItems.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new ConflictException('TX_CONFLICT');
      }

      const productId = (item as { productId?: unknown }).productId;
      const qty = (item as { qty?: unknown }).qty;

      if (typeof productId !== 'string' || typeof qty !== 'number' || qty <= 0 || !Number.isInteger(qty)) {
        throw new ConflictException('TX_CONFLICT');
      }

      return { productId, qty };
    });

    return this.aggregateChargeItems(parsedItems);
  }

  private async resolveChargeItemsForCommit(eventId: string, items: { productId: string; qty: number }[]) {
    const productIds = items.map((item) => item.productId);
    const products = await this.productsRepository.find({ where: { id: In(productIds), eventId } });
    if (products.length !== productIds.length) {
      throw new ConflictException('TX_CONFLICT');
    }

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new ConflictException('TX_CONFLICT');
      }
      const lineTotalCents = product.priceCents * item.qty;
      return {
        productId: item.productId,
        qty: item.qty,
        priceCents: product.priceCents,
        lineTotalCents,
      };
    });
  }

  private aggregateChargeItems(items: { productId: string; qty: number }[]) {
    const qtyByProduct = new Map<string, number>();
    for (const item of items) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
    }
    return Array.from(qtyByProduct.entries()).map(([productId, qty]) => ({ productId, qty }));
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
