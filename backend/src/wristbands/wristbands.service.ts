import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Event } from '../events/entities/event.entity';
import { DevicesService } from '../devices/devices.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { InitWristbandDto } from './dto/init-wristband.dto';
import { Wristband, WristbandStatus } from './entities/wristband.entity';
import { calculateSignature, ctrToBuffer, uuidToBytes } from './wristband-crypto';

@Injectable()
export class WristbandsService {
  private readonly logger = new Logger(WristbandsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wristband)
    private readonly wristbandsRepository: Repository<Wristband>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    private readonly devicesService: DevicesService,
  ) {}

  async init(dto: InitWristbandDto, deviceId: string, user: { id: string; email: string }) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, user);
    if (dto.eventId && dto.eventId !== device.eventId) {
      throw new ConflictException('DEVICE_EVENT_MISMATCH');
    }
    const event = await this.eventsRepository.findOne({ where: { id: device.eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const uidHex = dto.uidHex.toLowerCase();
    const existing = await this.wristbandsRepository.findOne({
      where: { eventId: device.eventId, uidHex },
    });

    if (existing) {
      const sigHex = this.buildSignatureHex(
        event.hmacSecret,
        uidHex,
        existing.tagIdHex,
        existing.ctrCurrent,
        device.eventId,
      );
      this.logger.log(`Wristband init already initialized eventId=${device.eventId} uidHex=${uidHex}`);
      return {
        alreadyInitialized: true,
        tagIdHex: existing.tagIdHex,
        ctrCurrent: existing.ctrCurrent,
        sigHex,
      };
    }

    const tagIdHex = randomBytes(16).toString('hex');
    const created = await this.dataSource.transaction(async (manager) => {
      const wristband = manager.create(Wristband, {
        eventId: device.eventId,
        uidHex,
        tagIdHex,
        ctrCurrent: 0,
        status: WristbandStatus.ACTIVE,
        lastSeenAt: null,
      });
      const savedWristband = await manager.save(Wristband, wristband);

      const wallet = manager.create(Wallet, {
        eventId: device.eventId,
        wristbandId: savedWristband.id,
        balanceCents: 0,
      });
      await manager.save(Wallet, wallet);

      return savedWristband;
    });

    const sigHex = this.buildSignatureHex(event.hmacSecret, uidHex, tagIdHex, 0, device.eventId);
    this.logger.log(`Wristband init new eventId=${device.eventId} uidHex=${uidHex}`);
    return {
      alreadyInitialized: false,
      tagIdHex: created.tagIdHex,
      ctrCurrent: created.ctrCurrent,
      sigHex,
    };
  }

  private buildSignatureHex(secret: string | Buffer, uidHex: string, tagIdHex: string, ctr: number, eventId: string) {
    const uidBytes = Buffer.from(uidHex, 'hex');
    const tagIdBytes = Buffer.from(tagIdHex, 'hex');
    const ctrBytes = ctrToBuffer(ctr);
    const eventIdBytes = uuidToBytes(eventId);
    const msg = Buffer.concat([uidBytes, tagIdBytes, ctrBytes, eventIdBytes]);
    return calculateSignature(secret, msg).toString('hex');
  }
}
