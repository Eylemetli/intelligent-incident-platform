import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
    Incident,
    IncidentStatus,
    IncidentSeverity,
} from './entities/incident.entity';

import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { QueryFailedError, Repository } from 'typeorm';

@Injectable()
export class IncidentsService {
    constructor(
        @InjectRepository(Incident)
        private readonly incidentRepository: Repository<Incident>,
    ) { }

    // 1. Yeni incident oluştur
    async create(dto: CreateIncidentDto): Promise<Incident> {
        // Aynı event daha önce işlendi mi?
        if (dto.eventId) {
            const existingIncident = await this.incidentRepository.findOne({
                where: { eventId: dto.eventId },
            });

            if (existingIncident) {
                return existingIncident;
            }
        }

        const incident = this.incidentRepository.create({
            title: dto.title,
            description: dto.description,
            sourceService: dto.sourceService,
            severity: dto.severity ?? IncidentSeverity.MEDIUM,
            status: IncidentStatus.OPEN,
            errorCode: dto.errorCode ?? null,
            eventId: dto.eventId ?? null,
            resolvedAt: null,
        });

        try {
            return await this.incidentRepository.save(incident);
        } catch (error: unknown) {
            // Eşzamanlı isteklerde PostgreSQL unique constraint
            if (
                dto.eventId &&
                error instanceof QueryFailedError &&
                (error.driverError as { code?: string })?.code === '23505'
            ) {
                const existingIncident = await this.incidentRepository.findOne({
                    where: { eventId: dto.eventId },
                });

                if (existingIncident) {
                    return existingIncident;
                }
            }

            throw error;
        }
    }

    // 2. Tüm incident kayıtlarını listele
    async findAll(): Promise<Incident[]> {
        return this.incidentRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
    }

    // 3. ID ile incident getir
    async findOne(id: string): Promise<Incident> {
        const incident = await this.incidentRepository.findOne({
            where: { id },
        });

        if (!incident) {
            throw new NotFoundException('Incident bulunamadı');
        }

        return incident;
    }

    // 4. Incident durumunu güncelle
    async updateStatus(
        id: string,
        dto: UpdateIncidentStatusDto,
    ): Promise<Incident> {
        const incident = await this.findOne(id);

        if (
            incident.status === IncidentStatus.RESOLVED &&
            dto.status !== IncidentStatus.RESOLVED
        ) {
            throw new ConflictException(
                'Çözümlenmiş incident yeniden açılamaz',
            );
        }

        if (dto.status === IncidentStatus.RESOLVED) {
            if (incident.status !== IncidentStatus.RESOLVED) {
                incident.resolvedAt = new Date();
            }
        } else {
            incident.resolvedAt = null;
        }

        incident.status = dto.status;

        return this.incidentRepository.save(incident);
    }
}