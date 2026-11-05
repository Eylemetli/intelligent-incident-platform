import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, JwtPayload } from '../interfaces/authenticated-request.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const authorization = request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException('Token bulunamadı');
        }

        const [type, token, ...extra] = authorization.split(' ');

        if (type !== 'Bearer' || !token || extra.length > 0) {
            throw new UnauthorizedException('Geçersiz token formatı');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(
                token,
            );

            if (
                typeof payload.sub !== 'string' ||
                typeof payload.email !== 'string' ||
                typeof payload.role !== 'string'
            ) {
                throw new UnauthorizedException('Geçersiz token içeriği');
            }

            request.user = payload;

            return true;
        } catch {
            throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }
    }
}