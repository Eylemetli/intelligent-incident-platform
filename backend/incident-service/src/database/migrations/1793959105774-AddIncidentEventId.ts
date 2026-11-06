import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncidentEventId1793959105774 implements MigrationInterface {
    name = 'AddIncidentEventId1793959105774'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "incidents" ADD "event_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_incidents_event_id" ON "incidents"  ("event_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_incidents_event_id"`);
        await queryRunner.query(`ALTER TABLE "incidents" DROP COLUMN "event_id"`);
    }

}
