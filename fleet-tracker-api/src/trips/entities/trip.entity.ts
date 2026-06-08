import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TripStatus } from '../../common/enums';
import { Driver } from '../../drivers/entities/driver.entity';
import { Truck } from '../../trucks/entities/truck.entity';
import { TripStop } from './trip-stop.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'driver_id' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'uuid', name: 'truck_id' })
  truckId: string;

  @ManyToOne(() => Truck)
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ type: 'varchar', name: 'trailer_number' })
  trailerNumber: string;

  @Column({ type: 'varchar', name: 'starting_place' })
  startingPlace: string;

  @Column({ type: 'integer', name: 'starting_km' })
  startingKm: number;

  @Column({ type: 'integer', name: 'ending_km', nullable: true })
  endingKm: number | null;

  @Column({ type: 'decimal', name: 'total_km', nullable: true })
  totalKm: number | null;

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time', nullable: true })
  endTime: Date | null;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.CREATED })
  status: TripStatus;

  @OneToMany(() => TripStop, (stop) => stop.trip)
  stops: TripStop[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
