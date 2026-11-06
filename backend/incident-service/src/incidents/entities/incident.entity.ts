import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Index } from 'typeorm';

export enum IncidentSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export enum IncidentStatus {
    OPEN = 'open',
    INVESTIGATING = 'investigating',
    RESOLVED = 'resolved',
}
//Bu entity n8n otomasyonlarında ve Grafana dashboard'unda kullanacağımız olay bilgilerini saklayacak.
@Entity('incidents')
export class Incident {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 200 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({
        name: 'source_service',
        type: 'varchar',
        length: 100,
    })
    sourceService: string;

    @Column({
        type: 'enum',
        enum: IncidentSeverity,
        default: IncidentSeverity.MEDIUM,
    })
    severity: IncidentSeverity;

    @Column({
        type: 'enum',
        enum: IncidentStatus,
        default: IncidentStatus.OPEN,
    })
    status: IncidentStatus;

    @Column({
        name: 'error_code',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    errorCode: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({
        name: 'resolved_at',
        type: 'timestamp',
        nullable: true,
    })
    resolvedAt: Date | null;

    @Index('uq_incidents_event_id', { unique: true })
    @Column({
        name: 'event_id',
        type: 'uuid',
        nullable: true,
    })
    eventId: string | null;
}