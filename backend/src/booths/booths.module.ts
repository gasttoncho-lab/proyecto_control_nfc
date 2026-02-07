import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { BoothsAdminController } from './booths-admin.controller';
import { BoothsController } from './booths.controller';
import { BoothsService } from './booths.service';
import { Product } from '../products/entities/product.entity';
import { BoothProduct } from './entities/booth-product.entity';
import { Booth } from './entities/booth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booth, BoothProduct, Event, Product])],
  controllers: [BoothsController, BoothsAdminController],
  providers: [BoothsService],
})
export class BoothsModule {}
