import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendTransactionsTypeEnum1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE transactions MODIFY COLUMN type ENUM('TOPUP','BALANCE_CHECK','CHARGE') NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE transactions MODIFY COLUMN type ENUM('TOPUP','BALANCE_CHECK') NOT NULL",
    );
  }
}
