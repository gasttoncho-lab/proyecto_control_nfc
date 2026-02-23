import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const currentSecret = process.env.JWT_SECRET_CURRENT;
    if (!currentSecret) {
      throw new Error('JWT_SECRET_CURRENT is required');
    }
    const previousSecret = process.env.JWT_SECRET_PREVIOUS;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const token = rawJwtToken.toString();
        const parts = token.split('.');
        if (parts.length !== 3) {
          done(new UnauthorizedException(), null);
          return;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { iat?: number; exp?: number };
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp <= now) {
          done(null, currentSecret);
          return;
        }

        const candidates = previousSecret ? [currentSecret, previousSecret] : [currentSecret];
        for (const secret of candidates) {
          try {
            const signature = require('crypto')
              .createHmac('sha256', secret)
              .update(`${parts[0]}.${parts[1]}`)
              .digest('base64url');
            if (signature === parts[2]) {
              done(null, secret);
              return;
            }
          } catch {
            done(new UnauthorizedException(), null);
            return;
          }
        }

        done(new UnauthorizedException(), null);
      },
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role ?? UserRole.ADMIN,
    };
  }
}
