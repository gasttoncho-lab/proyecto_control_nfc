import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BoothProductAssignmentDto } from './dto/booth-product-assignment.dto';
import { CreateBoothWithEventDto } from './dto/create-booth-with-event.dto';
import { UpdateBoothDto } from './dto/update-booth.dto';
import { BoothsService } from './booths.service';

@Controller('booths')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BoothsAdminController {
  constructor(private readonly boothsService: BoothsService) {}

  @Post()
  async create(@Body() createBoothDto: CreateBoothWithEventDto) {
    return this.boothsService.create(createBoothDto.eventId, createBoothDto);
  }

  @Get()
  async list(@Query('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.boothsService.listByEvent(eventId);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) boothId: string,
    @Body() updateBoothDto: UpdateBoothDto,
  ) {
    return this.boothsService.update(boothId, updateBoothDto);
  }

  @Get(':id/products')
  async listProducts(@Param('id', new ParseUUIDPipe()) boothId: string) {
    return this.boothsService.listBoothProducts(boothId);
  }

  @Put(':id/products')
  async updateProducts(
    @Param('id', new ParseUUIDPipe()) boothId: string,
    @Body(new ParseArrayPipe({ items: BoothProductAssignmentDto }))
    assignments: BoothProductAssignmentDto[],
  ) {
    return this.boothsService.updateBoothProducts(boothId, assignments);
  }
}
