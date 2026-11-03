
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

        const [type, token] = authorization?.split(' ') ?? [];

        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Token gerekli');
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
            request.user = payload;
        } catch {
            throw new UnauthorizedException('Geçersiz veya süresi dolmuş token');
        }

        return true;
    }
}
