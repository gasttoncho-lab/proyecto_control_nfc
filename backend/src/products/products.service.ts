import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(eventId: string, createProductDto: CreateProductDto): Promise<Product> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const product = this.productsRepository.create({
      eventId,
      name: createProductDto.name,
      priceCents: createProductDto.priceCents,
      isActive: createProductDto.isActive,
    });

    return this.productsRepository.save(product);
  }
}
