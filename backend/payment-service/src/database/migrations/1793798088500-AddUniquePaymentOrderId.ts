import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniquePaymentOrderId1793798088500 implements MigrationInterface {
    name = 'AddUniquePaymentOrderId1793798088500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payments_order_id" ON "payments"  ("order_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_payments_order_id"`);
    }

}
