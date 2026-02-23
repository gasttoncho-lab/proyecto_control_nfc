import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      return false;
    }

    const role = request.user.role as UserRole | undefined;
    if (role === UserRole.ADMIN) {
      return true;
    }

    if (role === UserRole.OPERATOR) {
      const isReadIncidents = request.method === 'GET' && /^\/admin\/events\/[^/]+\/incidents$/.test(request.path);
      if (isReadIncidents) {
        return true;
      }
    }

    throw new ForbiddenException();
  }
}
