import { Booth } from '../../booths/entities/booth.entity';
import { Event } from '../../events/entities/event.entity';
import { Product } from '../../products/entities/product.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_items')
@Index('IDX_transaction_items_event_booth', ['eventId', 'boothId'])
@Index('IDX_transaction_items_event_product', ['eventId', 'productId'])
@Index('IDX_transaction_items_event_transaction', ['eventId', 'transactionId'])
@Index('UQ_transaction_items_event_transaction_product', ['eventId', 'transactionId', 'productId'], { unique: true })
export class TransactionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.items, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'eventId', referencedColumnName: 'eventId' },
    { name: 'transactionId', referencedColumnName: 'id' },
  ])
  transaction: Transaction;

  @Column({ type: 'uuid', nullable: true })
  boothId: string | null;

  @ManyToOne(() => Booth, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'boothId' })
  booth: Booth | null;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'int' })
  lineTotalCents: number;

  @CreateDateColumn()
  createdAt: Date;
}
