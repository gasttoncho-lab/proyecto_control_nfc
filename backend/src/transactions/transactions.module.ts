import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { Event } from '../events/entities/event.entity';
import { Product } from '../products/entities/product.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband } from '../wristbands/entities/wristband.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TransactionItem, Event, Wristband, Wallet, Product]), DevicesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
