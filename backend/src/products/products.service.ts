import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';

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
      status: createProductDto.status ?? ProductStatus.ACTIVE,
    });

    return this.productsRepository.save(product);
  }

  async listByEvent(eventId: string): Promise<Product[]> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.productsRepository.find({ where: { eventId } });
  }

  async listActiveByEvent(eventId: string): Promise<Product[]> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.productsRepository.find({ where: { eventId, status: ProductStatus.ACTIVE } });
  }

  async update(productId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    this.productsRepository.merge(product, updateProductDto);
    return this.productsRepository.save(product);
  }
}
