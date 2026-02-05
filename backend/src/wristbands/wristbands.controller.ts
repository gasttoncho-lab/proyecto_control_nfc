import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { InitWristbandDto } from './dto/init-wristband.dto';
import { WristbandsService } from './wristbands.service';

@Controller('wristbands')
@UseGuards(JwtAuthGuard, AdminGuard)
export class WristbandsController {
  constructor(private readonly wristbandsService: WristbandsService) {}

  @Post('init')
  async init(@Body() dto: InitWristbandDto) {
    return this.wristbandsService.init(dto);
  }
}
