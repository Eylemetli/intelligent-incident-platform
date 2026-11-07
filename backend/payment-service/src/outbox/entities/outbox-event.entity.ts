import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum OutboxStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SENT = 'sent',
}

@Entity('outbox_events')
@Index('idx_outbox_status_next_attempt', [
    'status',
    'nextAttemptAt',
])
@Index('uq_outbox_event_aggregate', [
    'eventType',
    'aggregateId',
], { unique: true })
export class OutboxEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'event_type',
        type: 'varchar',
        length: 100,
    })
    eventType: string;

    @Column({
        name: 'aggregate_id',
        type: 'uuid',
    })
    aggregateId: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({
        type: 'enum',
        enum: OutboxStatus,
        default: OutboxStatus.PENDING,
    })
    status: OutboxStatus;

    @Column({
        type: 'int',
        default: 0,
    })
    attempts: number;

    @Column({
        name: 'next_attempt_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    nextAttemptAt: Date;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt: Date;

    @Column({
        name: 'sent_at',
        type: 'timestamp',
        nullable: true,
    })
    sentAt: Date | null;

    @Column({
        name: 'locked_at',
        type: 'timestamp',
        nullable: true,
    })
    lockedAt: Date | null;

    @Column({
        name: 'locked_by',
        type: 'varchar',
        length: 150,
        nullable: true,
    })
    lockedBy: string | null;
}