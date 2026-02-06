import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateBoothDto } from './dto/create-booth.dto';
import { BoothsService } from './booths.service';

@Controller('events/:eventId/booths')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BoothsController {
  constructor(private readonly boothsService: BoothsService) {}

  @Post()
  async create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() createBoothDto: CreateBoothDto,
  ) {
    return this.boothsService.create(eventId, createBoothDto);
  }

  @Get()
  async list(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.boothsService.listByEvent(eventId);
  }
}
