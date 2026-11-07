import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutboxLeaseFields1794055778583 implements MigrationInterface {
    name = 'AddOutboxLeaseFields1794055778583'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "outbox_events" ADD "locked_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "outbox_events" ADD "locked_by" character varying(150)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "outbox_events" DROP COLUMN "locked_by"`);
        await queryRunner.query(`ALTER TABLE "outbox_events" DROP COLUMN "locked_at"`);
    }

}
