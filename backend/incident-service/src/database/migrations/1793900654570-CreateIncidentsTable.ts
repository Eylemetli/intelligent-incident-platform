import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIncidentsTable1793900654570 implements MigrationInterface {
    name = 'CreateIncidentsTable1793900654570'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."incidents_severity_enum" AS ENUM('low', 'medium', 'high', 'critical')`);
        await queryRunner.query(`CREATE TYPE "public"."incidents_status_enum" AS ENUM('open', 'investigating', 'resolved')`);
        await queryRunner.query(`CREATE TABLE "incidents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text NOT NULL, "source_service" character varying(100) NOT NULL, "severity" "public"."incidents_severity_enum" NOT NULL DEFAULT 'medium', "status" "public"."incidents_status_enum" NOT NULL DEFAULT 'open', "error_code" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "resolved_at" TIMESTAMP, CONSTRAINT "PK_ccb34c01719889017e2246469f9" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "incidents"`);
        await queryRunner.query(`DROP TYPE "public"."incidents_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."incidents_severity_enum"`);
    }

}
