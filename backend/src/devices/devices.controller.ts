import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuthorizeDeviceDto } from './dto/authorize-device.dto';
import { RevokeDeviceDto } from './dto/revoke-device.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async getSession(@Headers('x-device-id') deviceId: string, @Request() req) {
    return this.devicesService.getSession(deviceId, req.user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async listAll() {
    return this.devicesService.listAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('authorize')
  async authorize(@Body() dto: AuthorizeDeviceDto) {
    return this.devicesService.authorize(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('revoke')
  async revoke(@Body() dto: RevokeDeviceDto) {
    return this.devicesService.revoke(dto.deviceId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':deviceId')
  @HttpCode(204)
  async remove(@Param('deviceId') deviceId: string) {
    await this.devicesService.deleteAuthorization(deviceId);
  }
}
