import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { GeofenceType } from '../../common/enums';

@Entity('geofences')
export class Geofence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: GeofenceType })
  type: GeofenceType;

  @Column({ type: 'jsonb' })
  coordinates: any;

  @Column({ type: 'integer', name: 'radius_metres', nullable: true })
  radiusMetres: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
