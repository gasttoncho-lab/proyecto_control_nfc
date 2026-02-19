import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvalidatedWristbandStatus1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE wristbands MODIFY status ENUM('ACTIVE','BLOCKED','INVALIDATED') NOT NULL DEFAULT 'ACTIVE'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE wristbands SET status='BLOCKED' WHERE status='INVALIDATED'");
    await queryRunner.query("ALTER TABLE wristbands MODIFY status ENUM('ACTIVE','BLOCKED') NOT NULL DEFAULT 'ACTIVE'");
  }
}
