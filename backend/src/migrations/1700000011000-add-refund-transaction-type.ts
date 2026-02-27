import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundTransactionType1700000011000 implements MigrationInterface {
  name = 'AddRefundTransactionType1700000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `transactions` MODIFY `type` ENUM('TOPUP','BALANCE_CHECK','CHARGE','REFUND') NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `transactions` MODIFY `type` ENUM('TOPUP','BALANCE_CHECK','CHARGE') NOT NULL",
    );
  }
}
