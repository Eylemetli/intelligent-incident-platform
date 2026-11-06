
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
    OutboxEvent,
    OutboxStatus,
} from './entities/outbox-event.entity';

import {
    IncidentClientService,
    CreateIncidentPayload,
} from '../incident-client/incident-client.service';

@Injectable()
export class OutboxWorker {
    private readonly logger = new Logger(OutboxWorker.name);
    private running = false;

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly outboxRepository: Repository<OutboxEvent>,
        private readonly incidentClient: IncidentClientService,
        private readonly dataSource: DataSource,
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async processPendingEvents(): Promise<void> {
        if (this.running) return;

        this.running = true;

        try {
            const leaseTimeout = new Date(Date.now() - 60_000);

            const recoveryResult = await this.outboxRepository
                .createQueryBuilder()
                .update(OutboxEvent)
                .set({
                    status: OutboxStatus.PENDING,
                    nextAttemptAt: new Date(),
                })
                .where('status = :status', {
                    status: OutboxStatus.PROCESSING,
                })
                .andWhere('next_attempt_at <= :timeout', {
                    timeout: leaseTimeout,
                })
                .execute();

            if (recoveryResult.affected) {
                this.logger.warn(
                    `${recoveryResult.affected} adet takılı Outbox kaydı kurtarıldı`,
                );
            }
            // Kayıtları transaction içinde kilitle ve sahiplen.
            const events = await this.dataSource.transaction(
                async (manager) => {
                    const pendingEvents = await manager
                        .getRepository(OutboxEvent)
                        .createQueryBuilder('event')
                        .where('event.status = :status', {
                            status: OutboxStatus.PENDING,
                        })
                        .andWhere('event.nextAttemptAt <= :now', {
                            now: new Date(),
                        })
                        .orderBy('event.createdAt', 'ASC')
                        .take(20)
                        .setLock('pessimistic_write')
                        .setOnLocked('skip_locked')
                        .getMany();

                    for (const event of pendingEvents) {
                        event.status = OutboxStatus.PROCESSING;
                        event.nextAttemptAt = new Date();
                    }

                    await manager.save(OutboxEvent, pendingEvents);

                    return pendingEvents;
                },
            );

            for (const event of events) {
                try {
                    await this.incidentClient.createIncident({
                        ...(event.payload as unknown as Omit<
                            CreateIncidentPayload,
                            'eventId'
                        >),
                        eventId: event.id,
                    });

                    await this.outboxRepository.update(
                        {
                            id: event.id,
                            status: OutboxStatus.PROCESSING,
                        },
                        {
                            status: OutboxStatus.SENT,
                            sentAt: new Date(),
                        },
                    );

                    this.logger.log(`Outbox gönderildi: ${event.id}`);
                } catch (error: unknown) {
                    const attempts = event.attempts + 1;

                    const delaySeconds = Math.min(
                        10 * Math.pow(2, Math.min(attempts - 1, 10)),
                        300,
                    );

                    await this.outboxRepository.update(
                        {
                            id: event.id,
                            status: OutboxStatus.PROCESSING,
                        },
                        {
                            status: OutboxStatus.PENDING,
                            attempts,
                            nextAttemptAt: new Date(
                                Date.now() + delaySeconds * 1000,
                            ),
                        },
                    );

                    this.logger.warn(
                        `Outbox gönderilemedi: ${event.id}, deneme=${attempts}`,
                    );
                }
            }
        } catch (error: unknown) {
            this.logger.error(
                'Outbox Worker çalışırken hata oluştu',
                error instanceof Error ? error.stack : String(error),
            );
        } finally {
            this.running = false;
        }
    }
}
