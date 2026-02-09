import { Event } from '../../events/entities/event.entity';
import { Wristband } from '../../wristbands/entities/wristband.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

export enum TransactionType {
  TOPUP = 'TOPUP',
  BALANCE_CHECK = 'BALANCE_CHECK',
  CHARGE = 'CHARGE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @PrimaryColumn({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  wristbandId: string;

  @ManyToOne(() => Wristband, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wristbandId' })
  wristband: Wristband;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'int', default: 0 })
  amountCents: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  operatorUserId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  boothId: string | null;

  @Column({ type: 'json' })
  payloadJson: Record<string, unknown>;

  @Column({ type: 'json' })
  resultJson: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
