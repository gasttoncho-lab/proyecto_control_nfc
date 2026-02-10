import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { EventsService } from './events.service';
import { EventStatus } from './entities/event.entity';

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

  @Get()
  async findAll(@Query('status') status?: EventStatus) {
    const events = await this.eventsService.findAll(status);
    return events.map(({ hmacSecret, ...rest }) => rest);
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


  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateEventStatusDto: UpdateEventStatusDto,
  ) {
    const event = await this.eventsService.updateStatus(id, updateEventStatusDto.status);
    const { hmacSecret, ...rest } = event;
    return rest;
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
