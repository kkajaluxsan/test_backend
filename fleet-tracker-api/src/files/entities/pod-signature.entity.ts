import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryRecord } from '../../trips/entities/delivery-record.entity';

@Entity('pod_signatures')
export class PodSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'delivery_id' })
  deliveryId: string;

  @ManyToOne(() => DeliveryRecord)
  @JoinColumn({ name: 'delivery_id' })
  delivery: DeliveryRecord;

  @Column({ type: 'varchar', name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', name: 's3_url', nullable: true })
  s3Url: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
