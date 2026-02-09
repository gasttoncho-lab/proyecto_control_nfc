import { Controller, Get, Headers, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from '../devices/devices.service';
import { ProductsService } from './products.service';
import { ProductStatus } from './entities/product.entity';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly devicesService: DevicesService,
  ) {}

  @Get('products')
  async list(@Headers('x-device-id') deviceId: string, @Request() req) {
    const device = await this.devicesService.getAuthorizedDeviceOrThrow(deviceId, req.user);
    const products = await this.productsService.listActiveByEvent(device.eventId);
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      isActive: product.status === ProductStatus.ACTIVE,
    }));
  }
}
