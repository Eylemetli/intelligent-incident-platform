
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() request: AuthenticatedRequest) {
        return {
            message: 'Korumalı profile erişim başarılı',
            user: request.user,
        };
    }


    @Get('admin-only')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    adminOnly() {
        return {
            message: 'Admin alanına erişim başarılı',
        };
    }

    @Get('developer-only')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DEVELOPER)
    developerOnly() {
        return {
            message: 'Developer alanına erişim başarılı',
        };
    }

    @Get('manager-only')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.MANAGER)
    managerOnly() {
        return {
            message: 'Manager alanına erişim başarılı',
        };
    }


}
