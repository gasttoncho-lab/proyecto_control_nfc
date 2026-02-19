import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum ReplaceSessionStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
}

@Entity('replace_sessions')
export class ReplaceSession {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  oldWristbandId: string;

  @Column({ type: 'int' })
  balanceCentsSnapshot: number;

  @Column({ type: 'varchar', length: 255 })
  operatorUserId: string;

  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'enum', enum: ReplaceSessionStatus, default: ReplaceSessionStatus.PENDING })
  status: ReplaceSessionStatus;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true })
  newWristbandId: string | null;

  @Column({ type: 'char', length: 64, nullable: true })
  newTagUidHex: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
