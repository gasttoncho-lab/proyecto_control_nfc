import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToTransactionStatus1700000005000 implements MigrationInterface {
  name = 'AddPendingToTransactionStatus1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `transactions` MODIFY `status` ENUM('APPROVED','DECLINED','PENDING') NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback al enum anterior
    await queryRunner.query(
      "ALTER TABLE `transactions` MODIFY `status` ENUM('APPROVED','DECLINED') NOT NULL",
    );
  }
}
