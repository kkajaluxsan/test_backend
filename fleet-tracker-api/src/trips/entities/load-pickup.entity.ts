import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { TripStop } from '../../trips/entities/trip-stop.entity';

@Entity('load_pickups')
export class LoadPickup {
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

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lon: number;

  @Column({ type: 'integer', name: 'km_reading' })
  kmReading: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'gps_accuracy' })
  gpsAccuracy: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
