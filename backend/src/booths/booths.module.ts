import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { BoothsController } from './booths.controller';
import { BoothsService } from './booths.service';
import { Booth } from './entities/booth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booth, Event])],
  controllers: [BoothsController],
  providers: [BoothsService],
})
export class BoothsModule {}
