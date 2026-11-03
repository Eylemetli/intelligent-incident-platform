
import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

//Kullanıcı bulundu-şifre doğrulandı-başarılı giriş için jwt oluşturuldu jwt'ye şifre eklenmedi
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);

        if (!user || !user.isActive) {
            throw new UnauthorizedException(
                'E-posta veya şifre hatalı',
            );
        }

        const passwordValid = await argon2.verify(
            user.passwordHash,
            dto.password,
        );

        if (!passwordValid) {
            throw new UnauthorizedException(
                'E-posta veya şifre hatalı',
            );
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            accessToken: await this.jwtService.signAsync(payload),
            tokenType: 'Bearer',
            expiresIn: 900,
        };
    }
}
