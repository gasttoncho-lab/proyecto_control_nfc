import { Booth } from '../../booths/entities/booth.entity';
import { Product } from '../../products/entities/product.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EventStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.OPEN })
  status: EventStatus;

  @Column({ type: 'varbinary', length: 32 })
  hmacSecret: Buffer;

  @OneToMany(() => Booth, (booth) => booth.event)
  booths: Booth[];

  @OneToMany(() => Product, (product) => product.event)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
