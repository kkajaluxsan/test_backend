import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FuelType } from '../../common/enums';
import { Trip } from '../../trips/entities/trip.entity';
import { Truck } from '../../trucks/entities/truck.entity';
import { Driver } from '../../drivers/entities/driver.entity';

@Entity('fuel_logs')
export class FuelLog {
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

  @Column({ type: 'enum', enum: FuelType, default: FuelType.DIESEL })
  type: FuelType;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  litres: number;

  @Column({ type: 'decimal', precision: 6, scale: 3, name: 'price_per_litre' })
  pricePerLitre: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_cost' })
  totalCost: number;

  @Column({ type: 'integer', name: 'km_reading' })
  kmReading: number;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
