import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';

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
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async processPendingEvents(): Promise<void> {
        if (this.running) return;

        this.running = true;

        try {
            const events = await this.outboxRepository.find({
                where: {
                    status: OutboxStatus.PENDING,
                    nextAttemptAt: LessThanOrEqual(new Date()),
                },
                order: { createdAt: 'ASC' },
                take: 20,
            });

            for (const event of events) {
                try {
                    await this.incidentClient.createIncident({
                        ...(event.payload as unknown as Omit<CreateIncidentPayload, 'eventId'>),
                        eventId: event.id,
                    });

                    event.status = OutboxStatus.SENT;
                    event.sentAt = new Date();

                    await this.outboxRepository.save(event);

                    this.logger.log(`Outbox gönderildi: ${event.id}`);
                } catch (error: unknown) {
                    event.attempts += 1;

                    // Artan bekleme süresi, en fazla 5 dakika
                    const delaySeconds = Math.min(
                        10 * Math.pow(2, Math.min(event.attempts - 1, 10)),
                        300,
                    );

                    event.nextAttemptAt = new Date(
                        Date.now() + delaySeconds * 1000,
                    );

                    await this.outboxRepository.save(event);

                    this.logger.warn(
                        `Outbox gönderilemedi: ${event.id}, ` +
                        `deneme=${event.attempts}`,
                    );
                }
            }
        } finally {
            this.running = false;
        }
    }
}