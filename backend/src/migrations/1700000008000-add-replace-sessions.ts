import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddReplaceSessions1700000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'replace_sessions',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, isNullable: false },
          { name: 'eventId', type: 'char', length: '36', isNullable: false },
          { name: 'oldWristbandId', type: 'char', length: '36', isNullable: false },
          { name: 'balanceCentsSnapshot', type: 'int', isNullable: false },
          { name: 'operatorUserId', type: 'varchar', length: '255', isNullable: false },
          { name: 'deviceId', type: 'varchar', length: '255', isNullable: false },
          { name: 'reason', type: 'varchar', length: '255', isNullable: false },
          { name: 'status', type: 'enum', enum: ['PENDING', 'DONE'], default: "'PENDING'" },
          { name: 'expiresAt', type: 'datetime', isNullable: false },
          { name: 'newWristbandId', type: 'char', length: '36', isNullable: true },
          { name: 'newTagUidHex', type: 'char', length: '64', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.query('CREATE INDEX IDX_replace_sessions_lookup ON replace_sessions(eventId, oldWristbandId, operatorUserId, deviceId, status, expiresAt)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_replace_sessions_lookup ON replace_sessions');
    await queryRunner.dropTable('replace_sessions', true);
  }
}
