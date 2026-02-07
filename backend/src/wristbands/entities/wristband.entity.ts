import { Event } from '../../events/entities/event.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum WristbandStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

@Entity('wristbands')
export class Wristband {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'varchar', length: 128 })
  uidHex: string;

  @Column({ type: 'char', length: 32 })
  tagIdHex: string;

  @Column({ type: 'int', default: 0 })
  ctrCurrent: number;

  @Column({ type: 'enum', enum: WristbandStatus, default: WristbandStatus.ACTIVE })
  status: WristbandStatus;

  @OneToOne(() => Wallet, (wallet) => wallet.wristband)
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt: Date | null;
}
