import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1700000010000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          VARCHAR(36)  NOT NULL,
        tokenHash   VARCHAR(64)  NOT NULL,
        userId      CHAR(36)     NOT NULL, 
        expiresAt   DATETIME     NOT NULL,
        revokedAt   DATETIME     NULL DEFAULT NULL,
        createdAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_refresh_token_hash (tokenHash),
        INDEX idx_refresh_token_user (userId),
        CONSTRAINT fk_refresh_token_user
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
  }
}