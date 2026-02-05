import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddTransactions1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'char',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'eventId',
            type: 'char',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'wristbandId',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['TOPUP', 'BALANCE_CHECK'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['APPROVED', 'DECLINED'],
          },
          {
            name: 'amountCents',
            type: 'int',
            default: 0,
          },
          {
            name: 'operatorUserId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'deviceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'payloadJson',
            type: 'json',
          },
          {
            name: 'resultJson',
            type: 'json',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('transactions', [
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['wristbandId'],
        referencedTableName: 'wristbands',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions', true);
  }
}
