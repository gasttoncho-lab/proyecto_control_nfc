import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Transaction, Booth])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
