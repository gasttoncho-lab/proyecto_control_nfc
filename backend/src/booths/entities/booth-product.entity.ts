import { Product } from '../../products/entities/product.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Booth } from './booth.entity';

@Entity('booth_products')
export class BoothProduct {
  @PrimaryColumn({ type: 'uuid' })
  boothId: string;

  @PrimaryColumn({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Booth, (booth) => booth.boothProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boothId' })
  booth: Booth;

  @ManyToOne(() => Product, (product) => product.boothProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
