import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import { IncidentsService } from './incidents.service';
import {
    Incident,
    IncidentSeverity,
    IncidentStatus,
} from './entities/incident.entity';

describe('IncidentsService', () => {
    let service: IncidentsService;

    const repository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const makeIncident = (
        overrides: Partial<Incident> = {},
    ): Incident =>
        ({
            id: 'incident-123',
            title: 'Payment Service Hatası',
            description: 'Ödeme başarısız oldu',
            sourceService: 'payment-service',
            severity: IncidentSeverity.HIGH,
            status: IncidentStatus.OPEN,
            errorCode: 'PAYMENT_FAILED',
            resolvedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides,
        }) as Incident;

    beforeEach(async () => {
        jest.resetAllMocks();

        const module: TestingModule =
            await Test.createTestingModule({
                providers: [
                    IncidentsService,
                    {
                        provide: getRepositoryToken(Incident),
                        useValue: repository,
                    },
                ],
            }).compile();

        service = module.get<IncidentsService>(
            IncidentsService,
        );
    });

    describe('create', () => {
        it('yeni incident oluşturmalı', async () => {
            const dto = {
                title: 'Payment Service Hatası',
                description: 'Ödeme başarısız oldu',
                sourceService: 'payment-service',
                severity: IncidentSeverity.HIGH,
                errorCode: 'PAYMENT_FAILED',
            };

            const incident = makeIncident();

            repository.create.mockReturnValue(incident);
            repository.save.mockResolvedValue(incident);

            const result = await service.create(dto);

            expect(repository.create).toHaveBeenCalledWith({
                title: dto.title,
                description: dto.description,
                sourceService: dto.sourceService,
                severity: IncidentSeverity.HIGH,
                status: IncidentStatus.OPEN,
                errorCode: 'PAYMENT_FAILED',
                resolvedAt: null,
            });

            expect(repository.save).toHaveBeenCalledWith(
                incident,
            );

            expect(result).toEqual(incident);
        });

        it('severity verilmezse medium olmalı', async () => {
            const dto = {
                title: 'Order Service Hatası',
                description: 'Sipariş oluşturulamadı',
                sourceService: 'order-service',
            };

            const incident = makeIncident({
                severity: IncidentSeverity.MEDIUM,
                errorCode: null,
            });

            repository.create.mockReturnValue(incident);
            repository.save.mockResolvedValue(incident);

            await service.create(dto);

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: IncidentSeverity.MEDIUM,
                    errorCode: null,
                    status: IncidentStatus.OPEN,
                }),
            );
        });
    });

    describe('findAll', () => {
        it('incident kayıtlarını yeniden eskiye listelemeli', async () => {
            const incidents = [
                makeIncident({ id: 'incident-2' }),
                makeIncident({ id: 'incident-1' }),
            ];

            repository.find.mockResolvedValue(incidents);

            const result = await service.findAll();

            expect(repository.find).toHaveBeenCalledWith({
                order: {
                    createdAt: 'DESC',
                },
            });

            expect(result).toEqual(incidents);
        });

        it('kayıt yoksa boş dizi dönmeli', async () => {
            repository.find.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('ID ile incident getirmeli', async () => {
            const incident = makeIncident();

            repository.findOne.mockResolvedValue(incident);

            const result = await service.findOne(
                'incident-123',
            );

            expect(repository.findOne).toHaveBeenCalledWith({
                where: {
                    id: 'incident-123',
                },
            });

            expect(result).toEqual(incident);
        });

        it('incident bulunamazsa 404 dönmeli', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.findOne('invalid-id'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateStatus', () => {
        it('incident investigating durumuna geçmeli', async () => {
            const incident = makeIncident();

            repository.findOne.mockResolvedValue(incident);
            repository.save.mockImplementation(
                async (value: Incident) => value,
            );

            const result = await service.updateStatus(
                'incident-123',
                {
                    status: IncidentStatus.INVESTIGATING,
                },
            );

            expect(result.status).toBe(
                IncidentStatus.INVESTIGATING,
            );

            expect(result.resolvedAt).toBeNull();
        });

        it('incident resolved durumuna geçmeli', async () => {
            const incident = makeIncident();

            repository.findOne.mockResolvedValue(incident);
            repository.save.mockImplementation(
                async (value: Incident) => value,
            );

            const result = await service.updateStatus(
                'incident-123',
                {
                    status: IncidentStatus.RESOLVED,
                },
            );

            expect(result.status).toBe(
                IncidentStatus.RESOLVED,
            );

            expect(result.resolvedAt).toBeInstanceOf(Date);
        });

        it('resolved incident yeniden açılamamalı', async () => {
            const incident = makeIncident({
                status: IncidentStatus.RESOLVED,
                resolvedAt: new Date(),
            });

            repository.findOne.mockResolvedValue(incident);

            await expect(
                service.updateStatus('incident-123', {
                    status: IncidentStatus.OPEN,
                }),
            ).rejects.toThrow(ConflictException);

            expect(repository.save).not.toHaveBeenCalled();
        });

        it('resolved incident tekrar resolved yapılırsa tarih korunmalı', async () => {
            const resolvedDate = new Date(
                '2026-11-01T10:00:00Z',
            );

            const incident = makeIncident({
                status: IncidentStatus.RESOLVED,
                resolvedAt: resolvedDate,
            });

            repository.findOne.mockResolvedValue(incident);
            repository.save.mockImplementation(
                async (value: Incident) => value,
            );

            const result = await service.updateStatus(
                'incident-123',
                {
                    status: IncidentStatus.RESOLVED,
                },
            );

            expect(result.resolvedAt).toBe(resolvedDate);
        });

        it('incident bulunamazsa 404 dönmeli', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.updateStatus('invalid-id', {
                    status: IncidentStatus.RESOLVED,
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});