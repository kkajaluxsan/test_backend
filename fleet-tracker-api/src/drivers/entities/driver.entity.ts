import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Truck } from '../../trucks/entities/truck.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'uuid', name: 'assigned_truck_id', nullable: true })
  assignedTruckId: string | null;

  @OneToOne(() => Truck, { nullable: true })
  @JoinColumn({ name: 'assigned_truck_id' })
  assignedTruck: Truck;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
