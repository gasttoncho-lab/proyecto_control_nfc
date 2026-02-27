import { Body, Controller, Get, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  email: string;
  password: string;
}

class RefreshDto {
  refresh_token: string;
}

class LogoutDto {
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    if (!dto.refresh_token) throw new UnauthorizedException('refresh_token required');
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    if (dto.refresh_token) {
      await this.authService.logout(dto.refresh_token);
    }
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }
}
