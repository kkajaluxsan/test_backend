import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from '../../trips/entities/trip.entity';
import { Truck } from '../../trucks/entities/truck.entity';
import { Driver } from '../../drivers/entities/driver.entity';

@Entity('adblue_logs')
export class AdblueLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'uuid', name: 'truck_id' })
  truckId: string;

  @ManyToOne(() => Truck)
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ type: 'uuid', name: 'driver_id' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  litres: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ type: 'integer', name: 'km_reading' })
  kmReading: number;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
