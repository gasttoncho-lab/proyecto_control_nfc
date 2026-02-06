import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard, AdminGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() createEventDto: CreateEventDto) {
    const event = await this.eventsService.create(createEventDto);
    const { hmacSecret, ...rest } = event;
    return {
      ...rest,
      hmacSecretHex: hmacSecret.toString('hex'),
    };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const event = await this.eventsService.findOneWithRelations(id);
    const { hmacSecret, ...rest } = event;
    return {
      ...rest,
      hmacSecretHex: hmacSecret.toString('hex'),
    };
  }

  @Post(':id/close')
  async close(@Param('id', new ParseUUIDPipe()) id: string) {
    const event = await this.eventsService.close(id);
    const { hmacSecret, ...rest } = event;
    return {
      ...rest,
      hmacSecretHex: hmacSecret.toString('hex'),
    };
  }
}
