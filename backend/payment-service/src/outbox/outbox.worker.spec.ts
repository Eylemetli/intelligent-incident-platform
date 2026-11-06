
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { OutboxWorker } from './outbox.worker';
import {
    OutboxEvent,
    OutboxStatus,
} from './entities/outbox-event.entity';
import {
    IncidentClientService,
} from '../incident-client/incident-client.service';

describe('OutboxWorker', () => {
    let worker: OutboxWorker;

    const payload = {
        title: 'Ödeme işlemi başarısız',
        description: 'Ödeme başarısız oldu',
        sourceService: 'payment-service',
        severity: 'high' as const,
        errorCode: 'PAYMENT_FAILED',
    };

    const makeEvent = (
        overrides: Partial<OutboxEvent> = {},
    ): OutboxEvent =>
        ({
            id: '550e8400-e29b-41d4-a716-446655440000',
            eventType: 'payment.failed',
            aggregateId: '550e8400-e29b-41d4-a716-446655440001',
            payload,
            status: OutboxStatus.PENDING,
            attempts: 0,
            nextAttemptAt: new Date(),
            createdAt: new Date(),
            sentAt: null,
            ...overrides,
        }) as OutboxEvent;

    const recoveryQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn(),
    };

    const claimQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        setOnLocked: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
    };

    const repository = {
        createQueryBuilder: jest.fn(),
        update: jest.fn(),
    };

    const managerRepository = {
        createQueryBuilder: jest.fn(),
    };

    const manager = {
        getRepository: jest.fn(),
        save: jest.fn(),
    };

    const dataSource = {
        transaction: jest.fn(),
    };

    const incidentClient = {
        createIncident: jest.fn(),
    };

    beforeEach(async () => {
        jest.resetAllMocks();

        recoveryQueryBuilder.update.mockReturnThis();
        recoveryQueryBuilder.set.mockReturnThis();
        recoveryQueryBuilder.where.mockReturnThis();
        recoveryQueryBuilder.andWhere.mockReturnThis();

        claimQueryBuilder.where.mockReturnThis();
        claimQueryBuilder.andWhere.mockReturnThis();
        claimQueryBuilder.orderBy.mockReturnThis();
        claimQueryBuilder.take.mockReturnThis();
        claimQueryBuilder.setLock.mockReturnThis();
        claimQueryBuilder.setOnLocked.mockReturnThis();

        repository.createQueryBuilder.mockReturnValue(
            recoveryQueryBuilder,
        );

        recoveryQueryBuilder.execute.mockResolvedValue({
            affected: 0,
        });

        manager.getRepository.mockReturnValue(managerRepository);
        managerRepository.createQueryBuilder.mockReturnValue(
            claimQueryBuilder,
        );

        claimQueryBuilder.getMany.mockResolvedValue([]);
        manager.save.mockResolvedValue([]);
        repository.update.mockResolvedValue({ affected: 1 });
        incidentClient.createIncident.mockResolvedValue(undefined);

        dataSource.transaction.mockImplementation(
            async (callback: (entityManager: typeof manager) => Promise<unknown>) =>
                callback(manager),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxWorker,
                {
                    provide: getRepositoryToken(OutboxEvent),
                    useValue: repository,
                },
                {
                    provide: IncidentClientService,
                    useValue: incidentClient,
                },
                {
                    provide: DataSource,
                    useValue: dataSource,
                },
            ],
        }).compile();

        worker = module.get<OutboxWorker>(OutboxWorker);
    });

    it('PENDING olay başarıyla gönderildiğinde SENT olmalı', async () => {
        const event = makeEvent();
        claimQueryBuilder.getMany.mockResolvedValue([event]);

        await worker.processPendingEvents();

        expect(incidentClient.createIncident).toHaveBeenCalledWith({
            ...payload,
            eventId: event.id,
        });

        expect(repository.update).toHaveBeenCalledWith(
            {
                id: event.id,
                status: OutboxStatus.PROCESSING,
            },
            expect.objectContaining({
                status: OutboxStatus.SENT,
                sentAt: expect.any(Date),
            }),
        );

        expect(event.status).toBe(OutboxStatus.PROCESSING);
    });

    it('HTTP isteği başarısızsa retry için PENDING yapmalı', async () => {
        const event = makeEvent({ attempts: 0 });

        claimQueryBuilder.getMany.mockResolvedValue([event]);
        incidentClient.createIncident.mockRejectedValue(
            new Error('Incident Service erişilemiyor'),
        );

        const before = Date.now();

        await worker.processPendingEvents();

        const after = Date.now();

        expect(repository.update).toHaveBeenCalledWith(
            {
                id: event.id,
                status: OutboxStatus.PROCESSING,
            },
            expect.objectContaining({
                status: OutboxStatus.PENDING,
                attempts: 1,
                nextAttemptAt: expect.any(Date),
            }),
        );

        const update = repository.update.mock.calls[0][1] as {
            nextAttemptAt: Date;
        };

        expect(update.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
            before + 10_000,
        );
        expect(update.nextAttemptAt.getTime()).toBeLessThanOrEqual(
            after + 10_000,
        );
    });

    it('takılı kalan PROCESSING kayıtlarını kurtarmalı', async () => {
        recoveryQueryBuilder.execute.mockResolvedValue({
            affected: 2,
        });

        await worker.processPendingEvents();

        expect(recoveryQueryBuilder.set).toHaveBeenCalledWith(
            expect.objectContaining({
                status: OutboxStatus.PENDING,
                nextAttemptAt: expect.any(Date),
            }),
        );

        expect(recoveryQueryBuilder.andWhere).toHaveBeenCalledWith(
            'next_attempt_at <= :timeout',
            expect.objectContaining({
                timeout: expect.any(Date),
            }),
        );

        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });


    it('aynı worker eşzamanlı ikinci kez çalışmamalı', async () => {
        let releaseTransaction!: (events: OutboxEvent[]) => void;

        dataSource.transaction.mockImplementation(
            () =>
                new Promise<OutboxEvent[]>((resolve) => {
                    releaseTransaction = resolve;
                }),
        );

        const firstRun = worker.processPendingEvents();

        // İlk çalışmanın transaction aşamasına ulaşmasını bekle.
        await new Promise<void>((resolve) => setImmediate(resolve));

        // Worker hâlâ çalışırken ikinci kez çağır.
        await worker.processPendingEvents();

        // İkinci çağrı yeni transaction başlatmamalı.
        expect(dataSource.transaction).toHaveBeenCalledTimes(1);

        // Transaction'ı boş olay listesiyle tamamla.
        releaseTransaction([]);

        // İlk worker işleminin tamamlanmasını bekle.
        await firstRun;
    });


    it('kayıt seçerken SKIP LOCKED kullanmalı', async () => {
        await worker.processPendingEvents();

        expect(claimQueryBuilder.setLock).toHaveBeenCalledWith(
            'pessimistic_write',
        );

        expect(claimQueryBuilder.setOnLocked).toHaveBeenCalledWith(
            'skip_locked',
        );

        expect(claimQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('seçilen kayıtları PROCESSING durumuna almalı', async () => {
        const event = makeEvent();
        claimQueryBuilder.getMany.mockResolvedValue([event]);

        await worker.processPendingEvents();

        expect(manager.save).toHaveBeenCalledWith(
            OutboxEvent,
            [expect.objectContaining({
                id: event.id,
                status: OutboxStatus.PROCESSING,
                nextAttemptAt: expect.any(Date),
            })],
        );
    });
});
