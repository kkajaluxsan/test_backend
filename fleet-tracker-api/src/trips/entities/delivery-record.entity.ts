import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { TripStop } from '../../trips/entities/trip-stop.entity';

@Entity('delivery_records')
export class DeliveryRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'uuid', name: 'stop_id' })
  stopId: string;

  @ManyToOne(() => TripStop)
  @JoinColumn({ name: 'stop_id' })
  stop: TripStop;

  @Column({ type: 'varchar' })
  place: string;

  @Column({ type: 'integer', name: 'km_reading' })
  kmReading: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'labour_charges',
    nullable: true,
  })
  labourCharges: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
