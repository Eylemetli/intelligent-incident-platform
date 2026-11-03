
import {
    Injectable,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
    ) { }

    async create(dto: CreateUserDto) {
        const email = dto.email.trim().toLowerCase();

        const existingUser = await this.usersRepository.findOne({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('Bu e-posta zaten kayıtlı');
        }

        const passwordHash = await argon2.hash(dto.password);

        const user = this.usersRepository.create({
            name: dto.name.trim(),
            email,
            passwordHash,
        });

        try {
            const savedUser = await this.usersRepository.save(user);

            return {
                id: savedUser.id,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role,
                createdAt: savedUser.createdAt,
            };
        } catch (error: unknown) {
            if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === '23505'
            ) {
                throw new ConflictException('Bu e-posta zaten kayıtlı');
            }
            throw error;
        }
    }

    //Kullanıcı arama metodu-login esnasında e-postaya göre kullanıcı arar
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email: email.trim().toLowerCase() },
        });
    }

}
