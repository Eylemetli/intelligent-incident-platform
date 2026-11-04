
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles?.length) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const role = request.user?.role;

        if (!role || !requiredRoles.includes(role)) {
            throw new ForbiddenException(
                'Bu işlem için yetkiniz bulunmuyor',
            );
        }

        return true;
    }
}
