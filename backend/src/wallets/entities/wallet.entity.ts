import { Event } from '../../events/entities/event.entity';
import { Wristband } from '../../wristbands/entities/wristband.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  wristbandId: string;

  @OneToOne(() => Wristband, (wristband) => wristband.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wristbandId' })
  wristband: Wristband;

  @Column({ type: 'int', default: 0 })
  balanceCents: number;
}
