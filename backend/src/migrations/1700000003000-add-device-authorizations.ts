import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddDeviceAuthorizations1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'device_authorizations',
        columns: [
          {
            name: 'deviceId',
            type: 'varchar',
            length: '64',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'eventId',
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
            name: 'mode',
            type: 'enum',
            enum: ['TOPUP', 'CHARGE'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['AUTHORIZED', 'REVOKED'],
            default: "'AUTHORIZED'",
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastSeenAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('device_authorizations', [
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['boothId'],
        referencedTableName: 'booths',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('device_authorizations', true);
  }
}
