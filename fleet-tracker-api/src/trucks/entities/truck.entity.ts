import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TruckStatus } from '../../common/enums';
import { Driver } from '../../drivers/entities/driver.entity';

@Entity('trucks')
export class Truck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'registration_number', unique: true })
  registrationNumber: string;

  @Column({ type: 'varchar', name: 'trailer_number', default: '' })
  trailerNumber: string;

  @Column({ type: 'enum', enum: TruckStatus, default: TruckStatus.OFFLINE })
  status: TruckStatus;

  @Column({ type: 'uuid', name: 'assigned_driver_id', nullable: true })
  assignedDriverId: string | null;

  @OneToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'assigned_driver_id' })
  assignedDriver: Driver;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
