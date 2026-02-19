import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transactions/entities/transaction.entity';
import { UserEntity } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband, WristbandStatus } from '../wristbands/entities/wristband.entity';
import { AuthorizeDeviceDto } from './dto/authorize-device.dto';
import { ReplaceFinishDto } from './dto/replace-finish.dto';
import { ReplaceStartDto } from './dto/replace-start.dto';
import { DeviceAuthorization, DeviceMode, DeviceStatus } from './entities/device-authorization.entity';
import { ReplaceSession, ReplaceSessionStatus } from './entities/replace-session.entity';

@Injectable()
export class DevicesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DeviceAuthorization)
    private readonly devicesRepository: Repository<DeviceAuthorization>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Booth)
    private readonly boothsRepository: Repository<Booth>,
    @InjectRepository(Wristband)
    private readonly wristbandsRepository: Repository<Wristband>,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(ReplaceSession)
    private readonly replaceSessionsRepository: Repository<ReplaceSession>,
  ) {}

  async authorize(dto: AuthorizeDeviceDto) {
    if (dto.mode === DeviceMode.CHARGE && !dto.boothId) {
      throw new BadRequestException('boothId is required for CHARGE mode');
    }

    const user = await this.usersRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const event = await this.eventsRepository.findOne({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    let booth: Booth | null = null;
    if (dto.boothId) {
      booth = await this.boothsRepository.findOne({ where: { id: dto.boothId } });
      if (!booth) {
        throw new NotFoundException('Booth not found');
      }
    }

    const existing = await this.devicesRepository.findOne({ where: { deviceId: dto.deviceId } });
    const device = existing ?? this.devicesRepository.create({ deviceId: dto.deviceId });
    device.userId = dto.userId;
    device.eventId = dto.eventId;
    device.boothId = dto.boothId ?? null;
    device.mode = dto.mode;
    device.status = DeviceStatus.AUTHORIZED;

    return this.devicesRepository.save(device);
  }

  async replaceStart(dto: ReplaceStartDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.getAuthorizedDeviceOrThrow(deviceId, user);
    if (device.eventId !== dto.eventId) {
      throw new ConflictException('DEVICE_EVENT_MISMATCH');
    }

    const oldWristband = await this.wristbandsRepository.findOne({ where: { id: dto.oldWristbandId, eventId: dto.eventId } });
    if (!oldWristband) {
      throw new NotFoundException('Wristband not found');
    }
    if (oldWristband.status === WristbandStatus.INVALIDATED) {
      throw new ConflictException('WRISTBAND_ALREADY_INVALIDATED');
    }

    const oldWallet = await this.walletsRepository.findOne({ where: { eventId: dto.eventId, wristbandId: oldWristband.id } });
    if (!oldWallet) {
      throw new NotFoundException('Wallet not found');
    }

    const now = new Date();
    const existingPending = await this.replaceSessionsRepository.findOne({
      where: {
        eventId: dto.eventId,
        oldWristbandId: oldWristband.id,
        operatorUserId: user.id,
        deviceId: device.deviceId,
        status: ReplaceSessionStatus.PENDING,
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPending) {
      return {
        replaceSessionId: existingPending.id,
        balanceCents: existingPending.balanceCentsSnapshot,
        expiresAt: existingPending.expiresAt,
      };
    }

    const expiresAt = new Date(Date.now() + 60_000);
    const session = this.replaceSessionsRepository.create({
      id: randomUUID(),
      eventId: dto.eventId,
      oldWristbandId: oldWristband.id,
      balanceCentsSnapshot: oldWallet.balanceCents,
      operatorUserId: user.id,
      deviceId: device.deviceId,
      reason: dto.reason,
      status: ReplaceSessionStatus.PENDING,
      expiresAt,
      newWristbandId: null,
      newTagUidHex: null,
    });
    await this.replaceSessionsRepository.save(session);

    return { replaceSessionId: session.id, balanceCents: session.balanceCentsSnapshot, expiresAt: session.expiresAt };
  }

  async replaceFinish(dto: ReplaceFinishDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.getAuthorizedDeviceOrThrow(deviceId, user);
    const normalizedUidHex = dto.newTagUidHex.toLowerCase();

    return this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(ReplaceSession, {
        where: { id: dto.replaceSessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('REPLACE_SESSION_NOT_FOUND');
      if (session.operatorUserId !== user.id || session.deviceId !== device.deviceId) {
        throw new ForbiddenException('REPLACE_SESSION_NOT_ALLOWED');
      }
      if (session.status === ReplaceSessionStatus.DONE && session.newWristbandId) {
        return {
          newWristbandId: session.newWristbandId,
          transferredCents: session.balanceCentsSnapshot,
          oldWristbandId: session.oldWristbandId,
        };
      }
      if (session.expiresAt.getTime() < Date.now()) {
        throw new UnprocessableEntityException('REPLACE_SESSION_EXPIRED');
      }

      const oldWristband = await manager.findOne(Wristband, {
        where: { id: session.oldWristbandId, eventId: session.eventId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!oldWristband) throw new NotFoundException('Wristband not found');

      const oldWallet = await manager.findOne(Wallet, {
        where: { eventId: session.eventId, wristbandId: oldWristband.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!oldWallet) throw new NotFoundException('Wallet not found');

      let newWristband = await manager.findOne(Wristband, {
        where: { eventId: session.eventId, uidHex: normalizedUidHex },
        lock: { mode: 'pessimistic_write' },
      });

      if (!newWristband) {
        newWristband = manager.create(Wristband, {
          eventId: session.eventId,
          uidHex: normalizedUidHex,
          tagIdHex: randomBytes(16).toString('hex'),
          ctrCurrent: 0,
          status: WristbandStatus.ACTIVE,
          lastSeenAt: null,
        });
        newWristband = await manager.save(Wristband, newWristband);
      }
      if (newWristband.id === oldWristband.id) throw new ConflictException('NEW_WRISTBAND_MUST_BE_DIFFERENT');
      if (newWristband.status !== WristbandStatus.ACTIVE) throw new ConflictException('NEW_WRISTBAND_NOT_ACTIVE');

      let newWallet = await manager.findOne(Wallet, {
        where: { eventId: session.eventId, wristbandId: newWristband.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!newWallet) {
        newWallet = manager.create(Wallet, { eventId: session.eventId, wristbandId: newWristband.id, balanceCents: 0 });
      }

      const transferCents = session.balanceCentsSnapshot;
      oldWallet.balanceCents = Math.max(0, oldWallet.balanceCents - transferCents);
      newWallet.balanceCents += transferCents;
      oldWristband.status = WristbandStatus.INVALIDATED;

      await manager.save(Wallet, oldWallet);
      newWallet = await manager.save(Wallet, newWallet);
      await manager.save(Wristband, oldWristband);

      const payload = {
        eventId: session.eventId,
        oldWristbandId: oldWristband.id,
        newTagUidHex: normalizedUidHex,
        replaceSessionId: session.id,
        operatorUserId: user.id,
        deviceId: device.deviceId,
      };

      await manager.save(Transaction, {
        id: randomUUID(),
        eventId: session.eventId,
        wristbandId: oldWristband.id,
        type: TransactionType.TOPUP,
        status: TransactionStatus.APPROVED,
        amountCents: transferCents,
        operatorUserId: user.id,
        deviceId: device.deviceId,
        payloadJson: payload,
        resultJson: { code: 'REPLACE_TRANSFER_OUT', reason: session.reason, toWristbandId: newWristband.id },
      });

      await manager.save(Transaction, {
        id: randomUUID(),
        eventId: session.eventId,
        wristbandId: newWristband.id,
        type: TransactionType.TOPUP,
        status: TransactionStatus.APPROVED,
        amountCents: transferCents,
        operatorUserId: user.id,
        deviceId: device.deviceId,
        payloadJson: payload,
        resultJson: { code: 'REPLACE_TRANSFER_IN', reason: session.reason, fromWristbandId: oldWristband.id },
      });

      session.status = ReplaceSessionStatus.DONE;
      session.newWristbandId = newWristband.id;
      session.newTagUidHex = normalizedUidHex;
      await manager.save(ReplaceSession, session);

      return { newWristbandId: newWristband.id, transferredCents: transferCents, oldWristbandId: oldWristband.id };
    });
  }

  async revoke(deviceId: string) {
    const device = await this.devicesRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    device.status = DeviceStatus.REVOKED;
    return this.devicesRepository.save(device);
  }

  async deleteAuthorization(deviceId: string) {
    const device = await this.devicesRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    await this.devicesRepository.remove(device);
  }

  async getSession(deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesRepository.findOne({
      where: { deviceId },
      relations: { event: true, booth: true, user: true },
    });

    if (!device || device.status !== DeviceStatus.AUTHORIZED) {
      return { authorized: false };
    }

    const isAdminOverride = user.email === 'admin@example.com';
    if (device.userId !== user.id && !isAdminOverride) {
      return { authorized: false };
    }

    device.lastSeenAt = new Date();
    await this.devicesRepository.save(device);

    return {
      authorized: true,
      device: {
        deviceId: device.deviceId,
        mode: device.mode,
      },
      event: {
        id: device.event.id,
        name: device.event.name,
        status: device.event.status,
      },
      booth: device.booth
        ? {
            id: device.booth.id,
            name: device.booth.name,
          }
        : undefined,
    };
  }

  async getAuthorizedDeviceOrThrow(deviceId: string, user: { id: string; email: string }) {
    if (!deviceId) {
      throw new BadRequestException('X-Device-Id header required');
    }

    const session = await this.getSession(deviceId, user);
    if (!session.authorized) {
      throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }

    const device = await this.devicesRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
    }

    return device;
  }

  async listAll() {
    return this.devicesRepository.find({
      relations: { event: true, booth: true, user: true },
      order: { updatedAt: 'DESC' },
    });
  }
}
