import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentStage1790885538031 implements MigrationInterface {
  name = 'AddStudentStage1790885538031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Edited by hand: students saved before this migration were all predicted with
    // the full model, so they get that stage; then the default is removed so every
    // new student must say which stage was used.
    await queryRunner.query(
      `ALTER TABLE "student" ADD "stage" character varying NOT NULL DEFAULT 'after_period_2'`,
    );
    await queryRunner.query(
      `ALTER TABLE "student" ALTER COLUMN "stage" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "stage"`);
  }
}
