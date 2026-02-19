import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { UserEntity } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Wristband } from '../wristbands/entities/wristband.entity';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceAuthorization } from './entities/device-authorization.entity';
import { ReplaceSession } from './entities/replace-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceAuthorization, UserEntity, Event, Booth, Wristband, Wallet, Transaction, ReplaceSession])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
