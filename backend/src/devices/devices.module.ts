import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booth } from '../booths/entities/booth.entity';
import { Event } from '../events/entities/event.entity';
import { UserEntity } from '../users/entities/user.entity';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceAuthorization } from './entities/device-authorization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceAuthorization, UserEntity, Event, Booth])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
