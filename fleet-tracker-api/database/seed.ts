import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Import all entities
import { User } from '../src/users/entities/user.entity';
import { Driver } from '../src/drivers/entities/driver.entity';
import { Truck } from '../src/trucks/entities/truck.entity';
import { UserRole, TruckStatus } from '../src/common/enums';
import { dataSourceOptions } from './data-source';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const seed = async () => {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('📦 Connected to database. Starting seed...');

  try {
    // 1. Create Super Admin
    const adminPassword = await bcrypt.hash('Admin1234!', 12);
    let admin = await dataSource.getRepository(User).findOneBy({ email: 'admin@truckyitalia.com' });
    if (!admin) {
      admin = dataSource.getRepository(User).create({
        email: 'admin@truckyitalia.com',
        passwordHash: adminPassword,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      await dataSource.getRepository(User).save(admin);
      console.log('✅ Super Admin created');
    }

    // 2. Create Fleet Manager
    const managerPassword = await bcrypt.hash('Manager1234!', 12);
    let manager = await dataSource.getRepository(User).findOneBy({ email: 'manager@truckyitalia.com' });
    if (!manager) {
      manager = dataSource.getRepository(User).create({
        email: 'manager@truckyitalia.com',
        passwordHash: managerPassword,
        role: UserRole.FLEET_MANAGER,
        isActive: true,
      });
      await dataSource.getRepository(User).save(manager);
      console.log('✅ Fleet Manager created');
    }

    // 3. Create Drivers Users
    const driverPassword = await bcrypt.hash('Driver1234!', 12);
    
    let driverUser1 = await dataSource.getRepository(User).findOneBy({ email: 'driver1@truckyitalia.com' });
    if (!driverUser1) {
      driverUser1 = dataSource.getRepository(User).create({
        email: 'driver1@truckyitalia.com',
        passwordHash: driverPassword,
        role: UserRole.DRIVER,
        isActive: true,
      });
      await dataSource.getRepository(User).save(driverUser1);
    }

    let driverUser2 = await dataSource.getRepository(User).findOneBy({ email: 'driver2@truckyitalia.com' });
    if (!driverUser2) {
      driverUser2 = dataSource.getRepository(User).create({
        email: 'driver2@truckyitalia.com',
        passwordHash: driverPassword,
        role: UserRole.DRIVER,
        isActive: true,
      });
      await dataSource.getRepository(User).save(driverUser2);
    }
    console.log('✅ Driver users created');

    // 4. Create Trucks
    let truck1 = await dataSource.getRepository(Truck).findOneBy({ registrationNumber: 'MI-234AB' });
    if (!truck1) {
      truck1 = dataSource.getRepository(Truck).create({
        registrationNumber: 'MI-234AB',
        trailerNumber: 'TRL-001',
        status: TruckStatus.OFFLINE,
      });
      await dataSource.getRepository(Truck).save(truck1);
    }

    let truck2 = await dataSource.getRepository(Truck).findOneBy({ registrationNumber: 'MI-567CD' });
    if (!truck2) {
      truck2 = dataSource.getRepository(Truck).create({
        registrationNumber: 'MI-567CD',
        trailerNumber: 'TRL-002',
        status: TruckStatus.OFFLINE,
      });
      await dataSource.getRepository(Truck).save(truck2);
    }
    console.log('✅ Trucks created');

    // 5. Create Driver Profiles and Assign Trucks
    let driverProfile1 = await dataSource.getRepository(Driver).findOneBy({ userId: driverUser1.id });
    if (!driverProfile1) {
      driverProfile1 = dataSource.getRepository(Driver).create({
        userId: driverUser1.id,
        name: 'Mario Rossi',
        licenseNumber: 'IT-123456789',
        phone: '+393331234567',
        assignedTruckId: truck1.id,
      });
      await dataSource.getRepository(Driver).save(driverProfile1);
      
      truck1.assignedDriverId = driverProfile1.id;
      await dataSource.getRepository(Truck).save(truck1);
    }

    let driverProfile2 = await dataSource.getRepository(Driver).findOneBy({ userId: driverUser2.id });
    if (!driverProfile2) {
      driverProfile2 = dataSource.getRepository(Driver).create({
        userId: driverUser2.id,
        name: 'Luigi Bianchi',
        licenseNumber: 'IT-987654321',
        phone: '+393337654321',
        assignedTruckId: truck2.id,
      });
      await dataSource.getRepository(Driver).save(driverProfile2);

      truck2.assignedDriverId = driverProfile2.id;
      await dataSource.getRepository(Truck).save(truck2);
    }
    console.log('✅ Driver profiles created and trucks assigned');

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed.');
  }
};

seed();
