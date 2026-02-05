import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      return false;
    }

    // TODO: Reemplazar por verificación real de roles cuando exista un sistema de roles.
    // Mientras tanto, todo usuario autenticado se considera ADMIN.
    return true;
  }
}
