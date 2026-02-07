import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { Product } from '../products/entities/product.entity';
import { CreateBoothDto } from './dto/create-booth.dto';
import { BoothProductAssignmentDto } from './dto/booth-product-assignment.dto';
import { UpdateBoothDto } from './dto/update-booth.dto';
import { BoothProduct } from './entities/booth-product.entity';
import { Booth, BoothStatus } from './entities/booth.entity';

@Injectable()
export class BoothsService {
  constructor(
    @InjectRepository(Booth)
    private readonly boothsRepository: Repository<Booth>,
    @InjectRepository(BoothProduct)
    private readonly boothProductsRepository: Repository<BoothProduct>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
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

  async listByEvent(eventId: string): Promise<Booth[]> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.boothsRepository.find({ where: { eventId } });
  }

  async update(boothId: string, updateBoothDto: UpdateBoothDto): Promise<Booth> {
    const booth = await this.boothsRepository.findOne({ where: { id: boothId } });

    if (!booth) {
      throw new NotFoundException('Booth not found');
    }

    this.boothsRepository.merge(booth, updateBoothDto);
    return this.boothsRepository.save(booth);
  }

  async listBoothProducts(boothId: string) {
    const booth = await this.boothsRepository.findOne({ where: { id: boothId } });

    if (!booth) {
      throw new NotFoundException('Booth not found');
    }

    const products = await this.productsRepository.find({
      where: { eventId: booth.eventId },
      order: { name: 'ASC' },
    });

    const boothProducts = await this.boothProductsRepository.find({ where: { boothId } });
    const boothProductMap = new Map(boothProducts.map((item) => [item.productId, item.enabled]));

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      status: product.status,
      enabled: boothProductMap.get(product.id) ?? false,
    }));
  }

  async updateBoothProducts(boothId: string, assignments: BoothProductAssignmentDto[]) {
    const booth = await this.boothsRepository.findOne({ where: { id: boothId } });

    if (!booth) {
      throw new NotFoundException('Booth not found');
    }

    const productIds = assignments.map((assignment) => assignment.productId);
    if (productIds.length) {
      const products = await this.productsRepository.find({ where: { id: In(productIds) } });

      if (products.length !== productIds.length) {
        throw new NotFoundException('Product not found');
      }

      const invalidProduct = products.find((product) => product.eventId !== booth.eventId);
      if (invalidProduct) {
        throw new BadRequestException('Product does not belong to the same event as the booth');
      }
    }

    const existing = await this.boothProductsRepository.find({ where: { boothId } });
    const assignmentMap = new Map(assignments.map((assignment) => [assignment.productId, assignment]));

    const updates: BoothProduct[] = [];

    for (const record of existing) {
      const assignment = assignmentMap.get(record.productId);
      if (assignment) {
        record.enabled = assignment.enabled;
        assignmentMap.delete(record.productId);
        updates.push(record);
      } else if (record.enabled) {
        record.enabled = false;
        updates.push(record);
      }
    }

    for (const assignment of assignmentMap.values()) {
      updates.push(
        this.boothProductsRepository.create({
          boothId,
          productId: assignment.productId,
          enabled: assignment.enabled,
        }),
      );
    }

    if (updates.length) {
      await this.boothProductsRepository.save(updates);
    }
    return this.listBoothProducts(boothId);
  }
}
