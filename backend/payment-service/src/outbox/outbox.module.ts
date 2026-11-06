import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxWorker } from './outbox.worker';
import { IncidentClientModule } from '../incident-client/incident-client.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OutboxEvent]),
        IncidentClientModule,
    ],
    providers: [OutboxWorker],
    exports: [TypeOrmModule],
})
export class OutboxModule { }