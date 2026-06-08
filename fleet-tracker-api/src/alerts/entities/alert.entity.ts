import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertType, AlertSeverity } from '../../common/enums';
import { Truck } from '../../trucks/entities/truck.entity';
import { Driver } from '../../drivers/entities/driver.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'truck_id', nullable: true })
  truckId: string | null;

  @ManyToOne(() => Truck)
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ type: 'uuid', name: 'driver_id', nullable: true })
  driverId: string | null;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @Column({ type: 'varchar' })
  message: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lon: number | null;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'timestamp', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
