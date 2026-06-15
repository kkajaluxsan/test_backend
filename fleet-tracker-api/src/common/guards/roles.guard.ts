import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    // ADMIN roles (Super Admin and Fleet Manager)
    if (
      requiredRoles.includes(UserRole.SUPER_ADMIN) ||
      requiredRoles.includes(UserRole.FLEET_MANAGER)
    ) {
      if (
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.FLEET_MANAGER
      ) {
        return true;
      }
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    return true;
  }
}
