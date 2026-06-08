import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async findAll() {
    return this.userRepository.find({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const existing = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.userRepository.create({
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
    });

    const saved = await this.userRepository.save(user);

    if (createUserDto.role === UserRole.DRIVER) {
      const driver = this.driverRepository.create({
        userId: saved.id,
        name: createUserDto.driverName!,
        licenseNumber: createUserDto.licenseNumber!,
        phone: createUserDto.phone!,
      });
      await this.driverRepository.save(driver);
    }

    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: updateUserDto.email } });
      if (existing) {
        throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'Email already exists' });
      }
    }

    Object.assign(user, updateUserDto);
    const saved = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }
}
