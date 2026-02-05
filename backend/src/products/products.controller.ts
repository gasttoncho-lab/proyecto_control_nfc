import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@Controller('events/:eventId/products')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(eventId, createProductDto);
  }
}
