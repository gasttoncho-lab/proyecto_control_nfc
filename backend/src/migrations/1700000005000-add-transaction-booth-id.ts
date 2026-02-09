import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionBoothId1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE transactions ADD COLUMN boothId varchar(36) NULL");
    await queryRunner.query(
      "ALTER TABLE transactions ADD CONSTRAINT FK_transactions_booth FOREIGN KEY (boothId) REFERENCES booths(id) ON DELETE SET NULL",
    );
    await queryRunner.query('CREATE INDEX IDX_transactions_boothId ON transactions(boothId)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE transactions DROP FOREIGN KEY FK_transactions_booth');
    await queryRunner.query('DROP INDEX IDX_transactions_boothId ON transactions');
    await queryRunner.query('ALTER TABLE transactions DROP COLUMN boothId');
  }
}
