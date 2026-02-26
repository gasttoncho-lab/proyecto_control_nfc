import 'reflect-metadata';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { Event, EventStatus } from '../events/entities/event.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband, WristbandStatus } from '../wristbands/entities/wristband.entity';
import { calculateSignature, ctrToBuffer, uuidToBytes } from '../wristbands/wristband-crypto';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { TransactionsService } from './transactions.service';

// ─── Test constants ───────────────────────────────────────────────────────────
const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const UID_HEX = 'aabbccdd';
const TAG_ID_HEX = '11223344';
const CTR = 5;
const HMAC_SECRET = Buffer.from('deadbeef', 'hex');

function computeSig(uidHex: string, tagIdHex: string, ctr: number, eventId: string): string {
  const msg = Buffer.concat([
    Buffer.from(uidHex, 'hex'),
    Buffer.from(tagIdHex, 'hex'),
    ctrToBuffer(ctr),
    uuidToBytes(eventId),
  ]);
  return calculateSignature(HMAC_SECRET, msg).toString('hex');
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const device = { eventId: EVENT_ID, boothId: 'booth-1', mode: 'CHARGE' };
const baseUser = { id: 'user-1', email: 'op@test.com' };
const deviceId = 'device-1';

const mockEvent = {
  id: EVENT_ID,
  status: EventStatus.OPEN,
  hmacSecret: HMAC_SECRET,
};

const mockWristband = {
  id: 'wristband-1',
  eventId: EVENT_ID,
  uidHex: UID_HEX,
  tagIdHex: TAG_ID_HEX,
  ctrCurrent: CTR,
  status: WristbandStatus.ACTIVE,
};

const mockWallet = {
  id: 'wallet-1',
  eventId: EVENT_ID,
  wristbandId: 'wristband-1',
  balanceCents: 5000,
};

const mockProduct = {
  id: 'product-1',
  eventId: EVENT_ID,
  priceCents: 1000,
  status: ProductStatus.ACTIVE,
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };

  const mockDataSource = { transaction: jest.fn() };
  const mockTransactionsRepo = { findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const mockWristbandsRepo = { findOne: jest.fn(), save: jest.fn() };
  const mockWalletsRepo = { findOne: jest.fn() };
  const mockProductsRepo = { find: jest.fn() };
  const mockEventsRepo = { findOne: jest.fn() };
  const mockDevicesService = { getAuthorizedDeviceOrThrow: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionsRepo },
        { provide: getRepositoryToken(Wristband), useValue: mockWristbandsRepo },
        { provide: getRepositoryToken(Wallet), useValue: mockWalletsRepo },
        { provide: getRepositoryToken(Event), useValue: mockEventsRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductsRepo },
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    // Default manager setup — used inside dataSource.transaction callbacks
    mockDataSource.transaction.mockImplementation(async (cb) => cb(mockManager));
    mockManager.save.mockResolvedValue({});
    mockManager.count.mockResolvedValue(0);
    mockManager.create.mockImplementation((_entity, data) => data);
  });

  // ── chargePrepare ──────────────────────────────────────────────────────────
  describe('chargePrepare', () => {
    const sigHex = computeSig(UID_HEX, TAG_ID_HEX, CTR, EVENT_ID);
    const dto = {
      transactionId: 'tx-1',
      uidHex: UID_HEX,
      tagIdHex: TAG_ID_HEX,
      ctr: CTR,
      sigHex,
      items: [{ productId: 'product-1', qty: 2 }],
    };

    function setupValidateMocks(walletOverride?: Partial<typeof mockWallet>) {
      mockManager.findOne
        .mockResolvedValueOnce(mockEvent)
        .mockResolvedValueOnce(mockWristband)
        .mockResolvedValueOnce({ ...mockWallet, ...walletOverride });
    }

    it('returns PENDING with ctrNew/sigNewHex when funds are sufficient', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue(null);
      setupValidateMocks();
      mockProductsRepo.find.mockResolvedValue([mockProduct]);
      mockTransactionsRepo.save.mockResolvedValue({});

      const result = await service.chargePrepare(dto, deviceId, baseUser) as any;

      expect(result.status).toBe(TransactionStatus.PENDING);
      expect(result.totalCents).toBe(2000); // 1000 * 2
      expect(result.ctrNew).toBe(CTR + 1);
      expect(typeof result.sigNewHex).toBe('string');
      expect(result.expiresAt).toBeDefined();
    });

    it('returns DECLINED with INSUFFICIENT_FUNDS when balance is low', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue(null);
      setupValidateMocks({ balanceCents: 100 });
      mockProductsRepo.find.mockResolvedValue([mockProduct]);
      mockTransactionsRepo.save.mockResolvedValue({});

      const result = await service.chargePrepare(dto, deviceId, baseUser) as any;

      expect(result.status).toBe(TransactionStatus.DECLINED);
      expect(result.reason).toBe('INSUFFICIENT_FUNDS');
    });

    it('throws ForbiddenException when device mode is not CHARGE', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue({ ...device, mode: 'TOPUP' });

      await expect(service.chargePrepare(dto, deviceId, baseUser)).rejects.toThrow(ForbiddenException);
    });

    it('returns cached resultJson for duplicate transactionId (idempotency)', async () => {
      const cachedResult = { status: 'PENDING', totalCents: 2000, ctrNew: 6 };
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        status: TransactionStatus.PENDING,
        payloadJson: {
          type: 'CHARGE',
          transactionId: 'tx-1',
          eventId: EVENT_ID,
          boothId: 'booth-1',
          operatorUserId: 'user-1',
          deviceId: 'device-1',
          uidHex: UID_HEX,
          tagIdHex: TAG_ID_HEX,
          ctr: CTR,
          sigHex,
          items: [{ productId: 'product-1', qty: 2 }],
        },
        resultJson: cachedResult,
      });

      const result = await service.chargePrepare(dto, deviceId, baseUser);

      expect(result).toEqual(cachedResult);
      // validateRequest should not have been called
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ── chargeCommit ───────────────────────────────────────────────────────────
  describe('chargeCommit', () => {
    const ctrNew = CTR + 1;
    const sigNew = computeSig(UID_HEX, TAG_ID_HEX, ctrNew, EVENT_ID);

    const pendingTx = {
      id: 'tx-1',
      eventId: EVENT_ID,
      wristbandId: 'wristband-1',
      status: TransactionStatus.PENDING,
      amountCents: 2000,
      payloadJson: { items: [{ productId: 'product-1', qty: 2 }] },
      resultJson: {
        status: 'PENDING',
        totalCents: 2000,
        ctrNew,
        sigNewHex: sigNew,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    };

    const dto = { transactionId: 'tx-1' };

    it('approves a valid PENDING transaction and returns APPROVED', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue({ ...pendingTx });
      mockWalletsRepo.findOne.mockResolvedValue({ ...mockWallet });
      mockWristbandsRepo.findOne.mockResolvedValue({ ...mockWristband });
      mockProductsRepo.find.mockResolvedValue([mockProduct]);

      const result = await service.chargeCommit(dto, deviceId, baseUser) as any;

      expect(result.status).toBe(TransactionStatus.APPROVED);
      expect(result.totalCents).toBe(2000);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('returns DECLINED when transaction has expired', async () => {
      const expiredTx = {
        ...pendingTx,
        resultJson: {
          ...pendingTx.resultJson,
          expiresAt: new Date(Date.now() - 5000).toISOString(),
        },
      };
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue(expiredTx);
      mockTransactionsRepo.save.mockResolvedValue({});

      const result = await service.chargeCommit(dto, deviceId, baseUser) as any;

      expect(result.status).toBe(TransactionStatus.DECLINED);
      expect(result.reason).toBe('TX_CONFLICT');
    });

    it('returns DECLINED when wallet has insufficient funds at commit time', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue({ ...pendingTx });
      mockWalletsRepo.findOne.mockResolvedValue({ ...mockWallet, balanceCents: 500 });
      mockWristbandsRepo.findOne.mockResolvedValue({ ...mockWristband });
      mockTransactionsRepo.save.mockResolvedValue({});

      const result = await service.chargeCommit(dto, deviceId, baseUser) as any;

      expect(result.status).toBe(TransactionStatus.DECLINED);
      expect(result.reason).toBe('INSUFFICIENT_FUNDS');
    });

    it('returns cached resultJson for an already-APPROVED transaction (idempotency)', async () => {
      const approvedResult = { status: TransactionStatus.APPROVED, totalCents: 2000 };
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue({
        ...pendingTx,
        status: TransactionStatus.APPROVED,
        resultJson: approvedResult,
      });

      const result = await service.chargeCommit(dto, deviceId, baseUser);

      expect(result).toEqual(approvedResult);
      expect(mockWalletsRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws ConflictException when transaction does not exist', async () => {
      mockDevicesService.getAuthorizedDeviceOrThrow.mockResolvedValue(device);
      mockTransactionsRepo.findOne.mockResolvedValue(null);

      await expect(service.chargeCommit(dto, deviceId, baseUser)).rejects.toThrow(ConflictException);
    });
  });
});
