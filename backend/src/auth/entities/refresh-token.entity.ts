import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
