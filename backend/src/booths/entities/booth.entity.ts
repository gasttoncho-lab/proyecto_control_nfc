import { Event } from '../../events/entities/event.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum BoothStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('booths')
export class Booth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.booths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: BoothStatus, default: BoothStatus.ACTIVE })
  status: BoothStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
