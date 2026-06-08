import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Truck } from './entities/truck.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { CreateTruckDto, UpdateTruckDto, UpdateTruckStatusDto } from './dto/trucks.dto';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly tripsService: TripsService,
  ) {}

  async getAssigned(userId: string) {
    const driver = await this.driverRepository.findOne({
      where: { userId },
      relations: { assignedTruck: true },
    });

    if (!driver || !driver.assignedTruck) {
      throw new NotFoundException({ code: 'NO_ASSIGNED_TRUCK', message: 'No truck assigned to this driver' });
    }

    return driver.assignedTruck;
  }

  async findAll() {
    return this.truckRepository.find({
      relations: { assignedDriver: true },
      order: { registrationNumber: 'ASC' },
    });
  }

  async findOne(id: string) {
    const truck = await this.truckRepository.findOne({
      where: { id },
      relations: { assignedDriver: true },
    });

    if (!truck) {
      throw new NotFoundException({ code: 'TRUCK_NOT_FOUND', message: 'Truck not found' });
    }

    return truck;
  }

  async create(createTruckDto: CreateTruckDto) {
    const existing = await this.truckRepository.findOne({ 
      where: { registrationNumber: createTruckDto.registrationNumber } 
    });
    
    if (existing) {
      throw new ConflictException({ code: 'TRUCK_EXISTS', message: 'Truck with this registration already exists' });
    }

    const truck = this.truckRepository.create(createTruckDto);
    return this.truckRepository.save(truck);
  }

  async update(id: string, updateTruckDto: UpdateTruckDto) {
    const truck = await this.findOne(id);

    if (updateTruckDto.registrationNumber && updateTruckDto.registrationNumber !== truck.registrationNumber) {
      const existing = await this.truckRepository.findOne({ 
        where: { registrationNumber: updateTruckDto.registrationNumber } 
      });
      if (existing) {
        throw new ConflictException({ code: 'TRUCK_EXISTS', message: 'Truck with this registration already exists' });
      }
    }

    Object.assign(truck, updateTruckDto);
    return this.truckRepository.save(truck);
  }

  async getTripHistory(truckId: string, query: Record<string, unknown>) {
    await this.findOne(truckId);
    return this.tripsService.findByTruck(truckId, query);
  }

  async updateStatus(id: string, dto: UpdateTruckStatusDto, userId: string, ipAddress: string) {
    const truck = await this.findOne(id);
    truck.status = dto.status;
    const saved = await this.truckRepository.save(truck);

    const auditLog = this.auditLogRepository.create({
      userId,
      action: 'TRUCK_STATUS_UPDATED',
      entity: 'Truck',
      entityId: truck.id,
      ipAddress,
      timestamp: new Date(),
    });
    await this.auditLogRepository.save(auditLog);

    return saved;
  }

  async getLivePosition(id: string) {
    // Validate truck exists
    await this.findOne(id);
    
    const positionStr = await this.redis.get(`truck:${id}:position`);
    if (!positionStr) {
      return null;
    }
    
    try {
      const pos = JSON.parse(positionStr);
      return { truckId: id, ...pos };
    } catch (e) {
      return null;
    }
  }
}
