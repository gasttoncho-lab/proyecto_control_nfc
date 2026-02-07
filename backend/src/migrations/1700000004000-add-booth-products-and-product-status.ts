import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddBoothProductsAndProductStatus1700000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['ACTIVE', 'INACTIVE'],
        default: "'ACTIVE'",
      }),
    );

    await queryRunner.query(
      "UPDATE products SET status = CASE WHEN isActive = true THEN 'ACTIVE' ELSE 'INACTIVE' END",
    );

    await queryRunner.dropColumn('products', 'isActive');

    await queryRunner.createTable(
      new Table({
        name: 'booth_products',
        columns: [
          {
            name: 'boothId',
            type: 'char',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'productId',
            type: 'char',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('booth_products', [
      new TableForeignKey({
        columnNames: ['boothId'],
        referencedTableName: 'booths',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('booth_products', true);

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'isActive',
        type: 'boolean',
        default: true,
      }),
    );

    await queryRunner.query(
      "UPDATE products SET isActive = CASE WHEN status = 'ACTIVE' THEN true ELSE false END",
    );

    await queryRunner.dropColumn('products', 'status');
  }
}
