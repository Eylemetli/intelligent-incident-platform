import { RolesGuard } from './guards/roles.guard';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: { algorithm: 'HS256' },
                verifyOptions: { algorithms: ['HS256'] },
            }),
        }),
    ],
    providers: [JwtAuthGuard, RolesGuard],
    exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule { }