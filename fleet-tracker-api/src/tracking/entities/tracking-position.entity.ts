import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Truck } from '../../trucks/entities/truck.entity';
import { Trip } from '../../trips/entities/trip.entity';

@Entity('tracking_positions')
@Index('IDX_tracking_truck_timestamp', ['truckId', 'timestamp'])
export class TrackingPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'truck_id' })
  truckId: string;

  @ManyToOne(() => Truck)
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ type: 'uuid', name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lon: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  speed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  heading: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  accuracy: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  altitude: number | null;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
