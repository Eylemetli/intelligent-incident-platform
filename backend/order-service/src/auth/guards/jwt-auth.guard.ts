
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
    AuthenticatedRequest,
    JwtPayload,
} from '../interfaces/authenticated-request.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const authorization = request.headers.authorization;

        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token bulunamadı');
        }

        const token = authorization.slice(7).trim();

        if (!token) {
            throw new UnauthorizedException('Token bulunamadı');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
            request.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }
    }
}
