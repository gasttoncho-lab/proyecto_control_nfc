import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_DAYS   = 7;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): string {
    return randomBytes(40).toString('hex');
  }

  private refreshExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TOKEN_DAYS);
    return d;
  }

  // ── public API ────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.usersService.validatePassword(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? UserRole.ADMIN,
    };

    const access_token  = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refresh_token = await this.createRefreshToken(user.id);

    return {
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token rotation: revoke old, issue new
    await this.refreshTokenRepo.update(stored.id, { revokedAt: new Date() });

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? UserRole.ADMIN,
    };

    const access_token  = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refresh_token = await this.createRefreshToken(user.id);

    return { access_token, refresh_token };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.refreshTokenRepo.update(stored.id, { revokedAt: new Date() });
    }
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const { password, ...result } = user;
    return result;
  }

  // ── private ───────────────────────────────────────────────────────────────

  private async createRefreshToken(userId: string): Promise<string> {
    const raw  = this.generateRefreshToken();
    const hash = this.hashToken(raw);
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash: hash,
        userId,
        expiresAt: this.refreshExpiresAt(),
      }),
    );
    return raw;
  }
}
