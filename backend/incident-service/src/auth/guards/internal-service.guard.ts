import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        const providedKey = request.header('x-service-key');
        const expectedKey =
            this.configService.getOrThrow<string>('INTERNAL_SERVICE_KEY');

        if (!providedKey) {
            throw new UnauthorizedException('Servis anahtarı bulunamadı');
        }

        const providedBuffer = Buffer.from(providedKey);
        const expectedBuffer = Buffer.from(expectedKey);

        if (
            providedBuffer.length !== expectedBuffer.length ||
            !timingSafeEqual(providedBuffer, expectedBuffer)
        ) {
            throw new UnauthorizedException('Geçersiz servis anahtarı');
        }

        return true;
    }
}