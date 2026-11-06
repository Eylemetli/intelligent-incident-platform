import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOutboxEventsTable1793956919622 implements MigrationInterface {
    name = 'CreateOutboxEventsTable1793956919622'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."outbox_events_status_enum" AS ENUM('pending', 'processing', 'sent')`);
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_type" character varying(100) NOT NULL, "aggregate_id" uuid NOT NULL, "payload" jsonb NOT NULL, "status" "public"."outbox_events_status_enum" NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "sent_at" TIMESTAMP, CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_outbox_event_aggregate" ON "outbox_events"  ("event_type", "aggregate_id") `);
        await queryRunner.query(`CREATE INDEX "idx_outbox_status_next_attempt" ON "outbox_events"  ("status", "next_attempt_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_outbox_status_next_attempt"`);
        await queryRunner.query(`DROP INDEX "public"."uq_outbox_event_aggregate"`);
        await queryRunner.query(`DROP TABLE "outbox_events"`);
        await queryRunner.query(`DROP TYPE "public"."outbox_events_status_enum"`);
    }

}
