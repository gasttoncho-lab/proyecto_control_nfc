import 'reflect-metadata';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { calculateSignature, ctrToBuffer, uuidToBytes } from '../wristbands/wristband-crypto';
import { TransactionsService } from './transactions.service';
import { TransactionStatus, TransactionType } from './entities/transaction.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { Wristband, WristbandStatus } from '../wristbands/entities/wristband.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { DeviceMode } from '../devices/entities/device-authorization.entity';
import { ProductStatus } from '../products/entities/product.entity';

// ── Test constants ───────────────────────────────────────────────────────────

const EVENT_ID    = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
const WRISTBAND_ID = 'ww000001-0000-0000-0000-000000000001';
const UID_HEX     = 'deadbeef';
const TAG_ID_HEX  = 'cafebabe';
const CTR         = 9;
const HMAC_SECRET = 'test-secret-utf8';
const PRODUCT_ID  = 'pppppppp-0000-0000-0000-000000000001';
const TX_ID       = 'tttttttt-0000-0000-0000-000000000001';
const DEVICE_ID   = 'device-android-1';
const BOOTH_ID    = 'bbbbbbbb-0000-0000-0000-000000000001';
const USER        = { id: 'user-uuid-1', email: 'op@test.com' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeSigHex(uidHex: string, tagIdHex: string, ctr: number, eventId: string): string {
  const msg = Buffer.concat([
    Buffer.from(uidHex, 'hex'),
    Buffer.from(tagIdHex, 'hex'),
    ctrToBuffer(ctr),
    uuidToBytes(eventId),
  ]);
  return calculateSignature(HMAC_SECRET, msg).toString('hex');
}

// ── Mock factories ───────────────────────────────────────────────────────────

function makeRepos() {
  return {
    eventsRepository:       { findOne: jest.fn(), save: jest.fn() },
    wristbandsRepository:   { findOne: jest.fn(), save: jest.fn() },
    walletsRepository:      { findOne: jest.fn(), save: jest.fn() },
    transactionsRepository: { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() },
    productsRepository:     { find: jest.fn() },
  };
}

function makeDevicesService(overrides: Partial<{ mode: string; boothId: string | null }> = {}) {
  return {
    getAuthorizedDeviceOrThrow: jest.fn().mockResolvedValue({
      eventId: EVENT_ID,
      userId:  USER.id,
      mode:    overrides.mode   ?? DeviceMode.CHARGE,
      boothId: overrides.boothId !== undefined ? overrides.boothId : BOOTH_ID,
    }),
  };
}

function makeManager(mockEvent: any, mockWristband: any, mockWallet: any) {
  return {
    findOne: jest.fn().mockImplementation((entity: any, _opts: any) => {
      if (entity === Event)     return Promise.resolve(mockEvent);
      if (entity === Wristband) return Promise.resolve(mockWristband);
      if (entity === Wallet)    return Promise.resolve(mockWallet);
      return Promise.resolve(null);
    }),
    save: jest.fn().mockImplementation((_e: any, d: any) => Promise.resolve(d ?? _e)),
    create: jest.fn().mockImplementation((_e: any, d: any) => d),
    count: jest.fn().mockResolvedValue(0),
  };
}

// ── Shared fixtures ──────────────────────────────────────────────────────────

const mockEvent = {
  id:         EVENT_ID,
  status:     EventStatus.OPEN,
  hmacSecret: HMAC_SECRET,
};

const mockWristband = {
  id:         WRISTBAND_ID,
  eventId:    EVENT_ID,
  uidHex:     UID_HEX,
  tagIdHex:   TAG_ID_HEX,
  ctrCurrent: CTR,
  status:     WristbandStatus.ACTIVE,
};

const mockWallet = {
  eventId:      EVENT_ID,
  wristbandId:  WRISTBAND_ID,
  balanceCents: 1000,
};

const mockProduct = {
  id:         PRODUCT_ID,
  eventId:    EVENT_ID,
  priceCents: 500,
  status:     ProductStatus.ACTIVE,
};

// ── Service builder ───────────────────────────────────────────────────────────

function buildService(repos: ReturnType<typeof makeRepos>, devicesService: any, dataSource: any) {
  return new TransactionsService(
    dataSource as any,
    repos.eventsRepository as any,
    repos.wristbandsRepository as any,
    repos.walletsRepository as any,
    repos.transactionsRepository as any,
    repos.productsRepository as any,
    devicesService as any,
  );
}

// ════════════════════════════════════════════════════════════════════════════
// chargePrepare
// ════════════════════════════════════════════════════════════════════════════

describe('TransactionsService.chargePrepare', () => {
  const validSigHex = computeSigHex(UID_HEX, TAG_ID_HEX, CTR, EVENT_ID);

  const validDto = {
    transactionId: TX_ID,
    uidHex:        UID_HEX,
    tagIdHex:      TAG_ID_HEX,
    ctr:           CTR,
    sigHex:        validSigHex,
    items:         [{ productId: PRODUCT_ID, qty: 1 }],
  };

  it('happy path → returns PENDING with ctrNew and sigNewHex', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const manager = makeManager(mockEvent, mockWristband, mockWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null); // no existing tx
    repos.productsRepository.find.mockResolvedValue([mockProduct]);
    repos.transactionsRepository.save.mockResolvedValue({});

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargePrepare(validDto, DEVICE_ID, USER);

    const r = result as any;
    expect(r.status).toBe(TransactionStatus.PENDING);
    expect(r.totalCents).toBe(500);
    expect(r.ctrNew).toBe(CTR + 1);
    expect(r.sigNewHex).toBe(computeSigHex(UID_HEX, TAG_ID_HEX, CTR + 1, EVENT_ID));
    expect(r.expiresAt).toBeDefined();
    expect(repos.transactionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.PENDING, amountCents: 500 }),
    );
  });

  it('insufficient funds → returns DECLINED immediately', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const poorWallet = { ...mockWallet, balanceCents: 100 }; // 100 < 500
    const manager = makeManager(mockEvent, mockWristband, poorWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);
    repos.productsRepository.find.mockResolvedValue([mockProduct]);
    repos.transactionsRepository.save.mockResolvedValue({});

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargePrepare(validDto, DEVICE_ID, USER);

    expect(result.status).toBe(TransactionStatus.DECLINED);
    expect((result as any).reason).toBe('INSUFFICIENT_FUNDS');
    expect(repos.transactionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.DECLINED }),
    );
  });

  it('invalid signature → throws UnprocessableEntityException(INVALID_SIGNATURE)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const manager = makeManager(mockEvent, mockWristband, mockWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);

    const service = buildService(repos, devicesService, dataSource);
    await expect(
      service.chargePrepare({ ...validDto, sigHex: 'deadbeefdeadbeef' }, DEVICE_ID, USER),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('CTR replay (got < current) → throws UnprocessableEntityException(CTR_REPLAY)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const oldCtr = CTR - 1;
    const replaySig = computeSigHex(UID_HEX, TAG_ID_HEX, oldCtr, EVENT_ID);
    const manager = makeManager(mockEvent, mockWristband, mockWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);
    repos.transactionsRepository.save.mockResolvedValue({}); // persistCtrIncident

    const service = buildService(repos, devicesService, dataSource);
    let caught: any;
    try {
      await service.chargePrepare({ ...validDto, ctr: oldCtr, sigHex: replaySig }, DEVICE_ID, USER);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(UnprocessableEntityException);
    expect((caught.getResponse() as any).code).toBe('CTR_REPLAY');
  });

  it('CTR forward jump with valid sig → throws CTR_RESYNC_DONE_RETRY and resyncs wristband', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const futureCtr = CTR + 5;
    const futureSig = computeSigHex(UID_HEX, TAG_ID_HEX, futureCtr, EVENT_ID);

    const manager = makeManager(mockEvent, { ...mockWristband, ctrCurrent: CTR }, mockWallet);
    manager.save.mockResolvedValue({});
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);
    repos.transactionsRepository.save.mockResolvedValue({});

    const service = buildService(repos, devicesService, dataSource);
    let caught: any;
    try {
      await service.chargePrepare({ ...validDto, ctr: futureCtr, sigHex: futureSig }, DEVICE_ID, USER);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(UnprocessableEntityException);
    expect((caught.getResponse() as any).code).toBe('CTR_RESYNC_DONE_RETRY');
    // wristband CTR was updated in manager.save
    expect(manager.save).toHaveBeenCalled();
  });

  it('device mode not CHARGE → throws ForbiddenException', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService({ mode: DeviceMode.TOPUP });
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargePrepare(validDto, DEVICE_ID, USER)).rejects.toThrow(ForbiddenException);
  });

  it('no boothId → throws UnprocessableEntityException(BOOTH_NOT_ASSIGNED)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService({ boothId: null });
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargePrepare(validDto, DEVICE_ID, USER)).rejects.toThrow(UnprocessableEntityException);
  });

  it('idempotency: same transactionId + same payload → returns existing resultJson', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const dataSource = { transaction: jest.fn() };

    const existingPayload = {
      type: TransactionType.CHARGE,
      transactionId: TX_ID,
      eventId: EVENT_ID,
      boothId: BOOTH_ID,
      operatorUserId: USER.id,
      deviceId: DEVICE_ID,
      uidHex: UID_HEX,
      tagIdHex: TAG_ID_HEX,
      ctr: CTR,
      sigHex: validSigHex,
      items: [{ productId: PRODUCT_ID, qty: 1 }],
    };
    const existingResult = { status: TransactionStatus.PENDING, totalCents: 500 };
    repos.transactionsRepository.findOne.mockResolvedValue({
      id: TX_ID,
      status: TransactionStatus.PENDING,
      payloadJson: existingPayload,
      resultJson: existingResult,
    });

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargePrepare(validDto, DEVICE_ID, USER);
    expect(result).toEqual(existingResult);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('idempotency: same transactionId + different payload → throws ConflictException(TX_CONFLICT)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const dataSource = { transaction: jest.fn() };

    repos.transactionsRepository.findOne.mockResolvedValue({
      id: TX_ID,
      status: TransactionStatus.PENDING,
      payloadJson: { type: 'CHARGE', transactionId: TX_ID, items: [{ productId: 'other-product', qty: 1 }] },
      resultJson: {},
    });

    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargePrepare(validDto, DEVICE_ID, USER)).rejects.toThrow(ConflictException);
  });

  it('event is closed → throws UnprocessableEntityException(EVENT_CLOSED)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const closedEvent = { ...mockEvent, status: EventStatus.CLOSED };
    const manager = makeManager(closedEvent, mockWristband, mockWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);

    const service = buildService(repos, devicesService, dataSource);
    let caught: any;
    try {
      await service.chargePrepare(validDto, DEVICE_ID, USER);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UnprocessableEntityException);
    expect(JSON.stringify(caught.getResponse())).toContain('EVENT_CLOSED');
  });

  it('wristband invalidated → throws UnprocessableEntityException(WRISTBAND_INVALIDATED)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const blockedWristband = { ...mockWristband, status: WristbandStatus.INVALIDATED };
    const manager = makeManager(mockEvent, blockedWristband, mockWallet);
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)) };

    repos.transactionsRepository.findOne.mockResolvedValue(null);

    const service = buildService(repos, devicesService, dataSource);
    let caught: any;
    try {
      await service.chargePrepare(validDto, DEVICE_ID, USER);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UnprocessableEntityException);
    expect(JSON.stringify(caught.getResponse())).toContain('WRISTBAND_INVALIDATED');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// chargeCommit
// ════════════════════════════════════════════════════════════════════════════

describe('TransactionsService.chargeCommit', () => {
  const CTR_NEW = CTR + 1;
  const SIG_NEW = computeSigHex(UID_HEX, TAG_ID_HEX, CTR_NEW, EVENT_ID);
  const AMOUNT  = 500;

  function makePendingTx(overrides: Partial<{ expiresAt: string }> = {}) {
    const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 60_000).toISOString();
    return {
      id:          TX_ID,
      eventId:     EVENT_ID,
      wristbandId: WRISTBAND_ID,
      type:        TransactionType.CHARGE,
      status:      TransactionStatus.PENDING,
      amountCents: AMOUNT,
      payloadJson: {
        type: TransactionType.CHARGE,
        transactionId: TX_ID,
        eventId: EVENT_ID,
        boothId: BOOTH_ID,
        operatorUserId: USER.id,
        deviceId: DEVICE_ID,
        uidHex: UID_HEX,
        tagIdHex: TAG_ID_HEX,
        ctr: CTR,
        sigHex: computeSigHex(UID_HEX, TAG_ID_HEX, CTR, EVENT_ID),
        items: [{ productId: PRODUCT_ID, qty: 1 }],
      },
      resultJson: {
        status:    TransactionStatus.PENDING,
        totalCents: AMOUNT,
        ctrNew:    CTR_NEW,
        sigNewHex: SIG_NEW,
        expiresAt,
      },
    };
  }

  const commitDto = { transactionId: TX_ID };

  it('happy path → returns APPROVED, deducts wallet, updates wristband CTR', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();

    repos.transactionsRepository.findOne.mockResolvedValue(makePendingTx());
    repos.walletsRepository.findOne.mockResolvedValue({ ...mockWallet });
    repos.wristbandsRepository.findOne.mockResolvedValue({ ...mockWristband });
    repos.productsRepository.find.mockResolvedValue([mockProduct]);

    const savedItems: any[] = [];
    const commitManager = {
      save:   jest.fn().mockImplementation((_e: any, d: any) => { savedItems.push(d); return Promise.resolve(d); }),
      create: jest.fn().mockImplementation((_e: any, d: any) => d),
      count:  jest.fn().mockResolvedValue(0),
    };
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(commitManager)) };

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargeCommit(commitDto, DEVICE_ID, USER);

    expect(result.status).toBe(TransactionStatus.APPROVED);
    expect(result.totalCents).toBe(AMOUNT);

    // Wallet balance deducted
    const savedWallet = savedItems.find((d) => 'balanceCents' in d);
    expect(savedWallet?.balanceCents).toBe(mockWallet.balanceCents - AMOUNT);

    // Wristband CTR advanced
    const savedWristband = savedItems.find((d) => 'ctrCurrent' in d);
    expect(savedWristband?.ctrCurrent).toBe(CTR_NEW);
  });

  it('expired PENDING → marks DECLINED with reason TX_CONFLICT', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const expiredTx = makePendingTx({ expiresAt: new Date(Date.now() - 1000).toISOString() });

    repos.transactionsRepository.findOne.mockResolvedValue(expiredTx);
    repos.transactionsRepository.save.mockResolvedValue({});
    repos.walletsRepository.findOne.mockResolvedValue({ ...mockWallet });
    repos.wristbandsRepository.findOne.mockResolvedValue({ ...mockWristband });

    const dataSource = { transaction: jest.fn() };
    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargeCommit(commitDto, DEVICE_ID, USER);

    expect(result.status).toBe(TransactionStatus.DECLINED);
    expect((result as any).reason).toBe('TX_CONFLICT');
    expect(repos.transactionsRepository.save).toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('already APPROVED (idempotency) → returns existing resultJson without re-processing', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const approvedResult = { status: TransactionStatus.APPROVED, totalCents: AMOUNT };
    const approvedTx = { ...makePendingTx(), status: TransactionStatus.APPROVED, resultJson: approvedResult };

    repos.transactionsRepository.findOne.mockResolvedValue(approvedTx);
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargeCommit(commitDto, DEVICE_ID, USER);

    expect(result).toEqual(approvedResult);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('already DECLINED (idempotency) → returns existing resultJson without re-processing', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();
    const declinedResult = { status: TransactionStatus.DECLINED, totalCents: AMOUNT, reason: 'INSUFFICIENT_FUNDS' };
    const declinedTx = { ...makePendingTx(), status: TransactionStatus.DECLINED, resultJson: declinedResult };

    repos.transactionsRepository.findOne.mockResolvedValue(declinedTx);
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargeCommit(commitDto, DEVICE_ID, USER);

    expect(result).toEqual(declinedResult);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('transaction not found → throws ConflictException(TX_CONFLICT)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();

    repos.transactionsRepository.findOne.mockResolvedValue(null);
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargeCommit(commitDto, DEVICE_ID, USER)).rejects.toThrow(ConflictException);
  });

  it('wristband invalidated at commit time → throws UnprocessableEntityException', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();

    repos.transactionsRepository.findOne.mockResolvedValue(makePendingTx());
    repos.walletsRepository.findOne.mockResolvedValue({ ...mockWallet });
    repos.wristbandsRepository.findOne.mockResolvedValue({ ...mockWristband, status: WristbandStatus.INVALIDATED });

    const dataSource = { transaction: jest.fn() };
    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargeCommit(commitDto, DEVICE_ID, USER)).rejects.toThrow(UnprocessableEntityException);
  });

  it('balance dropped below amount at commit → marks DECLINED(INSUFFICIENT_FUNDS)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();

    repos.transactionsRepository.findOne.mockResolvedValue(makePendingTx());
    repos.walletsRepository.findOne.mockResolvedValue({ ...mockWallet, balanceCents: 0 });
    repos.wristbandsRepository.findOne.mockResolvedValue({ ...mockWristband });
    repos.transactionsRepository.save.mockResolvedValue({});

    const dataSource = { transaction: jest.fn() };
    const service = buildService(repos, devicesService, dataSource);
    const result = await service.chargeCommit(commitDto, DEVICE_ID, USER);

    expect(result.status).toBe(TransactionStatus.DECLINED);
    expect((result as any).reason).toBe('INSUFFICIENT_FUNDS');
  });

  it('device mode not CHARGE → throws ForbiddenException', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService({ mode: DeviceMode.TOPUP });
    const dataSource = { transaction: jest.fn() };

    const service = buildService(repos, devicesService, dataSource);
    await expect(service.chargeCommit(commitDto, DEVICE_ID, USER)).rejects.toThrow(ForbiddenException);
  });

  it('TransactionItems not duplicated on second commit call (count > 0)', async () => {
    const repos = makeRepos();
    const devicesService = makeDevicesService();

    repos.transactionsRepository.findOne.mockResolvedValue(makePendingTx());
    repos.walletsRepository.findOne.mockResolvedValue({ ...mockWallet });
    repos.wristbandsRepository.findOne.mockResolvedValue({ ...mockWristband });
    repos.productsRepository.find.mockResolvedValue([mockProduct]);

    const commitManager = {
      save:   jest.fn().mockImplementation((_e: any, d: any) => Promise.resolve(d)),
      create: jest.fn().mockImplementation((_e: any, d: any) => d),
      count:  jest.fn().mockResolvedValue(2), // items already exist
    };
    const dataSource = { transaction: jest.fn().mockImplementation(async (cb: any) => cb(commitManager)) };

    const service = buildService(repos, devicesService, dataSource);
    await service.chargeCommit(commitDto, DEVICE_ID, USER);

    // create should NOT have been called for TransactionItems since count > 0
    expect(commitManager.create).not.toHaveBeenCalled();
  });
});
