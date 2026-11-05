import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    const jwtService = {
        verifyAsync: jest.fn(),
    };

    const createContext = (authorization?: string) => {
        const request = {
            headers: authorization
                ? { authorization }
                : {},
            user: undefined as unknown,
        };

        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        } as ExecutionContext;

        return { context, request };
    };

    beforeEach(() => {
        jest.resetAllMocks();
        guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    });

    it('token yoksa 401 dönmeli', async () => {
        const { context } = createContext();

        await expect(
            guard.canActivate(context),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('Bearer formatı yanlışsa 401 dönmeli', async () => {
        const { context } = createContext('Basic abc123');

        await expect(
            guard.canActivate(context),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('bozuk token varsa 401 dönmeli', async () => {
        jwtService.verifyAsync.mockRejectedValue(
            new Error('invalid signature'),
        );

        const { context } = createContext('Bearer invalid-token');

        await expect(
            guard.canActivate(context),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('süresi dolmuş token varsa 401 dönmeli', async () => {
        jwtService.verifyAsync.mockRejectedValue(
            new Error('jwt expired'),
        );

        const { context } = createContext('Bearer expired-token');

        await expect(
            guard.canActivate(context),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('geçerli token varsa erişime izin vermeli', async () => {
        jwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'admin@example.com',
            role: 'admin',
        });

        const { context, request } = createContext(
            'Bearer valid-token',
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request.user).toEqual({
            sub: 'user-123',
            email: 'admin@example.com',
            role: 'admin',
        });

        expect(jwtService.verifyAsync).toHaveBeenCalledWith(
            'valid-token',
        );
    });

    it('token içeriğinde rol yoksa 401 dönmeli', async () => {
        jwtService.verifyAsync.mockResolvedValue({
            sub: 'user-123',
            email: 'admin@example.com',
        });

        const { context } = createContext('Bearer invalid-payload');

        await expect(
            guard.canActivate(context),
        ).rejects.toThrow(UnauthorizedException);
    });
});