import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddWristbandsWalletsAndEventSecret1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE events MODIFY hmacSecret VARBINARY(32) NOT NULL',
    );

    await queryRunner.createTable(
      new Table({
        name: 'wristbands',
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
            name: 'uidHex',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'tagIdHex',
            type: 'char',
            length: '32',
            isNullable: false,
          },
          {
            name: 'ctrCurrent',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'BLOCKED'],
            default: "'ACTIVE'",
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
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

    await queryRunner.createTable(
      new Table({
        name: 'wallets',
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
            name: 'wristbandId',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'balanceCents',
            type: 'int',
            default: 0,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'wristbands',
      new TableIndex({
        name: 'uniq_wristbands_event_uid',
        columnNames: ['eventId', 'uidHex'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'wristbands',
      new TableIndex({
        name: 'uniq_wristbands_event_tag',
        columnNames: ['eventId', 'tagIdHex'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'uniq_wallets_event_wristband',
        columnNames: ['eventId', 'wristbandId'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKeys('wristbands', [
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('wallets', [
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
    await queryRunner.dropTable('wallets', true);
    await queryRunner.dropTable('wristbands', true);
    await queryRunner.query(
      'ALTER TABLE events MODIFY hmacSecret VARCHAR(255) NOT NULL',
    );
  }
}
