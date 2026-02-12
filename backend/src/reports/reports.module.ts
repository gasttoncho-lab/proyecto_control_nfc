import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Product } from '../products/entities/product.entity';
import { TransactionItem } from '../transactions/entities/transaction-item.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Transaction, TransactionItem, Product, Booth])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
