import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband } from './entities/wristband.entity';
import { WristbandsController } from './wristbands.controller';
import { WristbandsService } from './wristbands.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wristband, Event, Wallet])],
  controllers: [WristbandsController],
  providers: [WristbandsService],
})
export class WristbandsModule {}
