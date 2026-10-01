import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790883458391 implements MigrationInterface {
  name = 'InitialSchema1790883458391';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "teacher" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying NOT NULL, CONSTRAINT "UQ_00634394dce7677d531749ed8e8" UNIQUE ("email"), CONSTRAINT "PK_2f807294148612a9751dacf1026" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "classroom" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "teacherId" integer NOT NULL, CONSTRAINT "PK_729f896c8b7b96ddf10c341e6ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "student" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "classroomId" integer NOT NULL, "features" jsonb NOT NULL, "riskProbability" double precision NOT NULL, "riskScore" double precision NOT NULL, "riskLevel" character varying NOT NULL, "anomaly" boolean NOT NULL, "intervention" character varying NOT NULL, "topFactors" jsonb NOT NULL, "predictedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_3d8016e1cb58429474a3c041904" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom" ADD CONSTRAINT "FK_2b3c1fa62762d7d0e828c139130" FOREIGN KEY ("teacherId") REFERENCES "teacher"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student" ADD CONSTRAINT "FK_426224f5597213259b1d58fc0f4" FOREIGN KEY ("classroomId") REFERENCES "classroom"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student" DROP CONSTRAINT "FK_426224f5597213259b1d58fc0f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom" DROP CONSTRAINT "FK_2b3c1fa62762d7d0e828c139130"`,
    );
    await queryRunner.query(`DROP TABLE "student"`);
    await queryRunner.query(`DROP TABLE "classroom"`);
    await queryRunner.query(`DROP TABLE "teacher"`);
  }
}
