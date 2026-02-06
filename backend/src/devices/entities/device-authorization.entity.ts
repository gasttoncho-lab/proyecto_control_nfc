import { Booth } from '../../booths/entities/booth.entity';
import { Event } from '../../events/entities/event.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum DeviceMode {
  TOPUP = 'TOPUP',
  CHARGE = 'CHARGE',
}

export enum DeviceStatus {
  AUTHORIZED = 'AUTHORIZED',
  REVOKED = 'REVOKED',
}

@Entity('device_authorizations')
export class DeviceAuthorization {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  deviceId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid', nullable: true })
  boothId: string | null;

  @ManyToOne(() => Booth, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'boothId' })
  booth: Booth | null;

  @Column({ type: 'enum', enum: DeviceMode })
  mode: DeviceMode;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.AUTHORIZED })
  status: DeviceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt: Date | null;
}
