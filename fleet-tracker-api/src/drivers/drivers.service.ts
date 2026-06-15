import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { Truck } from '../trucks/entities/truck.entity';
import { UpdateDriverDto, AssignTruckDto } from './dto/drivers.dto';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    private readonly tripsService: TripsService,
  ) {}

  async getTripHistory(driverId: string, query: Record<string, unknown>) {
    await this.findOne(driverId);
    return this.tripsService.findByDriver(driverId, query);
  }

  async getMe(userId: string) {
    const driver = await this.driverRepository.findOne({
      where: { userId },
      relations: { assignedTruck: true, user: true },
    });

    if (!driver) {
      throw new NotFoundException({
        code: 'DRIVER_NOT_FOUND',
        message: 'Driver profile not found',
      });
    }

    return driver;
  }

  async findAll() {
    return this.driverRepository.find({
      relations: { assignedTruck: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const driver = await this.driverRepository.findOne({
      where: { id },
      relations: { assignedTruck: true, user: true },
    });

    if (!driver) {
      throw new NotFoundException({
        code: 'DRIVER_NOT_FOUND',
        message: 'Driver profile not found',
      });
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto) {
    const driver = await this.findOne(id);
    Object.assign(driver, updateDriverDto);
    return this.driverRepository.save(driver);
  }

  async assignTruck(id: string, assignTruckDto: AssignTruckDto) {
    const driver = await this.findOne(id);

    const truck = await this.truckRepository.findOne({
      where: { id: assignTruckDto.truckId },
    });
    if (!truck) {
      throw new NotFoundException({
        code: 'TRUCK_NOT_FOUND',
        message: 'Truck not found',
      });
    }

    // Unassign previous driver if any
    if (truck.assignedDriverId && truck.assignedDriverId !== id) {
      const prevDriver = await this.driverRepository.findOne({
        where: { id: truck.assignedDriverId },
      });
      if (prevDriver) {
        prevDriver.assignedTruckId = null;
        await this.driverRepository.save(prevDriver);
      }
    }

    // Unassign previous truck if any
    if (driver.assignedTruckId && driver.assignedTruckId !== truck.id) {
      const prevTruck = await this.truckRepository.findOne({
        where: { id: driver.assignedTruckId },
      });
      if (prevTruck) {
        prevTruck.assignedDriverId = null;
        await this.truckRepository.save(prevTruck);
      }
    }

    driver.assignedTruckId = truck.id;
    truck.assignedDriverId = driver.id;

    await this.driverRepository.save(driver);
    await this.truckRepository.save(truck);

    return this.findOne(id);
  }
}
