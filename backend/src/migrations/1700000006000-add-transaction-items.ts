import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class AddTransactionItems1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transaction_items',
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
            isNullable: false,
          },
          {
            name: 'transactionId',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'boothId',
            type: 'char',
            length: '36',
            isNullable: true,
          },
          {
            name: 'productId',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'qty',
            type: 'int',
            unsigned: true,
            isNullable: false,
          },
          {
            name: 'priceCents',
            type: 'int',
            unsigned: true,
            isNullable: false,
          },
          {
            name: 'lineTotalCents',
            type: 'int',
            unsigned: true,
            isNullable: false,
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

    await queryRunner.createUniqueConstraint(
      'transaction_items',
      new TableUnique({
        name: 'UQ_transaction_items_event_transaction_product',
        columnNames: ['eventId', 'transactionId', 'productId'],
      }),
    );

    await queryRunner.createIndices('transaction_items', [
      new TableIndex({
        name: 'IDX_transaction_items_event_booth',
        columnNames: ['eventId', 'boothId'],
      }),
      new TableIndex({
        name: 'IDX_transaction_items_event_product',
        columnNames: ['eventId', 'productId'],
      }),
      new TableIndex({
        name: 'IDX_transaction_items_event_transaction',
        columnNames: ['eventId', 'transactionId'],
      }),
    ]);

    await queryRunner.createForeignKeys('transaction_items', [
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['eventId', 'transactionId'],
        referencedTableName: 'transactions',
        referencedColumnNames: ['eventId', 'id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['boothId'],
        referencedTableName: 'booths',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.query('ALTER TABLE `transaction_items` ADD CONSTRAINT `CHK_transaction_items_qty_positive` CHECK (`qty` > 0)');
    await queryRunner.query(
      'ALTER TABLE `transaction_items` ADD CONSTRAINT `CHK_transaction_items_price_non_negative` CHECK (`priceCents` >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `transaction_items` ADD CONSTRAINT `CHK_transaction_items_total_non_negative` CHECK (`lineTotalCents` >= 0)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transaction_items', true);
  }
}
