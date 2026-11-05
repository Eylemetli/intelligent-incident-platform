import {
    ForbiddenException,
} from '@nestjs/common';

import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
    let guard: RolesGuard;

    const reflector = {
        getAllAndOverride: jest.fn(),
    };

    const createContext = (role?: string) =>
        ({
            getHandler: () => jest.fn(),
            getClass: () => class TestController { },
            switchToHttp: () => ({
                getRequest: () => ({
                    user: role ? { role } : undefined,
                }),
            }),
        }) as unknown as ExecutionContext;

    beforeEach(() => {
        jest.resetAllMocks();

        guard = new RolesGuard(
            reflector as unknown as Reflector,
        );
    });

    it('rol kısıtlaması yoksa izin vermeli', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);

        const result = guard.canActivate(
            createContext('developer'),
        );

        expect(result).toBe(true);
    });

    it('admin yetkili endpoint erişimine izin vermeli', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'admin',
            'manager',
        ]);

        const result = guard.canActivate(
            createContext('admin'),
        );

        expect(result).toBe(true);
    });

    it('manager yetkili endpoint erişimine izin vermeli', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'admin',
            'manager',
        ]);

        const result = guard.canActivate(
            createContext('manager'),
        );

        expect(result).toBe(true);
    });

    it('developer yetkisiz endpoint için 403 dönmeli', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'admin',
            'manager',
        ]);

        expect(() =>
            guard.canActivate(createContext('developer')),
        ).toThrow(ForbiddenException);
    });

    it('kullanıcı rolü yoksa 403 dönmeli', () => {
        reflector.getAllAndOverride.mockReturnValue(['admin']);

        expect(() =>
            guard.canActivate(createContext()),
        ).toThrow(ForbiddenException);
    });

    it('developer okuma yetkisine sahipse izin vermeli', () => {
        reflector.getAllAndOverride.mockReturnValue([
            'admin',
            'manager',
            'developer',
        ]);

        const result = guard.canActivate(
            createContext('developer'),
        );

        expect(result).toBe(true);
    });
});