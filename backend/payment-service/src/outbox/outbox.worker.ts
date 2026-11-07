
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

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
    private readonly workerId = randomUUID();
    private running = false;

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly outboxRepository: Repository<OutboxEvent>,
        private readonly incidentClient: IncidentClientService,
        private readonly dataSource: DataSource,
    ) { }
    //Bu metot yalnızca ilgili worker'ın sahip olduğu kaydın lease süresini yeniler.
    private async renewLease(eventId: string): Promise<boolean> {
        const result = await this.outboxRepository.update(
            {
                id: eventId,
                status: OutboxStatus.PROCESSING,
                lockedBy: this.workerId,
            },
            {
                lockedAt: new Date(),
            },
        );

        return result.affected === 1;
    }

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
                    lockedAt: null,
                    lockedBy: null,
                })
                .where('status = :status', {
                    status: OutboxStatus.PROCESSING,
                })
                .andWhere('locked_at <= :timeout', {
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
                        .take(5)
                        .setLock('pessimistic_write')
                        .setOnLocked('skip_locked')
                        .getMany();

                    const lockedAt = new Date();

                    for (const event of pendingEvents) {
                        event.status = OutboxStatus.PROCESSING;
                        event.lockedAt = lockedAt;
                        event.lockedBy = this.workerId;
                    }

                    await manager.save(OutboxEvent, pendingEvents);

                    return pendingEvents;
                },
            );

            for (const event of events) {
                try {
                    const hasLease = await this.renewLease(event.id);

                    if (!hasLease) {
                        this.logger.warn(
                            `Outbox sahipliği kaybedildi: ${event.id}`,
                        );
                        continue;
                    }

                    await this.incidentClient.createIncident({
                        ...(event.payload as unknown as Omit<
                            CreateIncidentPayload,
                            'eventId'
                        >),
                        eventId: event.id,
                    });


                    const updateResult = await this.outboxRepository.update(
                        {
                            id: event.id,
                            status: OutboxStatus.PROCESSING,
                            lockedBy: this.workerId,
                        },
                        {
                            status: OutboxStatus.SENT,
                            sentAt: new Date(),
                            lockedAt: null,
                            lockedBy: null,
                        },
                    );

                    if (updateResult.affected !== 1) {
                        this.logger.warn(
                            `Outbox gönderildi ancak sahiplik kaybedildi: ${event.id}`,
                        );
                        continue;
                    }

                    this.logger.log(`Outbox gönderildi: ${event.id}`);


                    this.logger.log(`Outbox gönderildi: ${event.id}`);
                } catch (error: unknown) {
                    const attempts = event.attempts + 1;

                    const delaySeconds = Math.min(
                        10 * Math.pow(2, Math.min(attempts - 1, 10)),
                        300,
                    );

                    const retryResult = await this.outboxRepository.update(
                        {
                            id: event.id,
                            status: OutboxStatus.PROCESSING,
                            lockedBy: this.workerId,
                        },
                        {
                            status: OutboxStatus.PENDING,
                            attempts,
                            nextAttemptAt: new Date(
                                Date.now() + delaySeconds * 1000,
                            ),
                            lockedAt: null,
                            lockedBy: null,
                        },
                    );
                    if (retryResult.affected !== 1) {
                        this.logger.warn(
                            `Outbox retry güncellenemedi, sahiplik kaybedildi: ${event.id}`,
                        );
                        continue;
                    }

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
