import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { CreateBoothDto } from './dto/create-booth.dto';
import { Booth, BoothStatus } from './entities/booth.entity';

@Injectable()
export class BoothsService {
  constructor(
    @InjectRepository(Booth)
    private readonly boothsRepository: Repository<Booth>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(eventId: string, createBoothDto: CreateBoothDto): Promise<Booth> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const booth = this.boothsRepository.create({
      eventId,
      name: createBoothDto.name,
      status: BoothStatus.ACTIVE,
    });

    return this.boothsRepository.save(booth);
  }
}
