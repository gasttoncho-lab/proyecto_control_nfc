import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProductWithEventDto } from './dto/create-product-with-event.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductWithEventDto) {
    return this.productsService.create(createProductDto.eventId, createProductDto);
  }

  @Get()
  async list(@Query('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.productsService.listByEvent(eventId);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(productId, updateProductDto);
  }
}
