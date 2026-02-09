import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { Event } from '../events/entities/event.entity';
import { CatalogController } from './catalog.controller';
import { ProductsAdminController } from './products-admin.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Event]), DevicesModule],
  controllers: [ProductsController, ProductsAdminController, CatalogController],
  providers: [ProductsService],
})
export class ProductsModule {}
