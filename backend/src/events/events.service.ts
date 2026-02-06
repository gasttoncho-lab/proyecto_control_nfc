import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { Event, EventStatus } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const hmacSecret = randomBytes(32);
    const event = this.eventsRepository.create({
      name: createEventDto.name,
      hmacSecret,
      status: EventStatus.OPEN,
    });

    return this.eventsRepository.save(event);
  }

  async findOneWithRelations(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { booths: true, products: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findAll(status?: EventStatus): Promise<Event[]> {
    if (status) {
      return this.eventsRepository.find({ where: { status } });
    }
    return this.eventsRepository.find();
  }

  async close(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    event.status = EventStatus.CLOSED;
    return this.eventsRepository.save(event);
  }
}
