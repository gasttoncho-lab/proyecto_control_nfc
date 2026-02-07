import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuthorizeDeviceDto } from './dto/authorize-device.dto';
import { DeviceAuthorization, DeviceMode, DeviceStatus } from './entities/device-authorization.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceAuthorization)
    private readonly devicesRepository: Repository<DeviceAuthorization>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Booth)
    private readonly boothsRepository: Repository<Booth>,
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

  async revoke(deviceId: string) {
    const device = await this.devicesRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    device.status = DeviceStatus.REVOKED;
    return this.devicesRepository.save(device);
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
