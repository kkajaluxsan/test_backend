import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1717550000000 implements MigrationInterface {
  name = 'InitialSchema1717550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query("CREATE TYPE \"user_role_enum\" AS ENUM ('SUPER_ADMIN', 'FLEET_MANAGER', 'DRIVER')");
    await queryRunner.query("CREATE TYPE \"truck_status_enum\" AS ENUM ('ACTIVE', 'IDLE', 'OFFLINE', 'MAINTENANCE')");
    await queryRunner.query("CREATE TYPE \"trip_status_enum\" AS ENUM ('CREATED', 'ROUTE_PLANNED', 'IN_PROGRESS', 'DELIVERING', 'COMPLETED')");
    await queryRunner.query("CREATE TYPE \"stop_type_enum\" AS ENUM ('LOAD_PICKUP', 'DELIVERY')");
    await queryRunner.query("CREATE TYPE \"stop_status_enum\" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED')");
    await queryRunner.query("CREATE TYPE \"fuel_type_enum\" AS ENUM ('DIESEL')");
    await queryRunner.query("CREATE TYPE \"alert_type_enum\" AS ENUM ('SOS', 'OFFLINE', 'OVERSPEED', 'IDLE', 'LOW_FUEL', 'LOW_ADBLUE', 'GEOFENCE_ENTRY', 'GEOFENCE_EXIT')");
    await queryRunner.query("CREATE TYPE \"alert_severity_enum\" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')");
    await queryRunner.query("CREATE TYPE \"geofence_type_enum\" AS ENUM ('CIRCLE', 'POLYGON')");

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "trucks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "registration_number" varchar NOT NULL UNIQUE,
        "trailer_number" varchar NOT NULL,
        "status" "truck_status_enum" NOT NULL DEFAULT 'OFFLINE',
        "assigned_driver_id" uuid NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "license_number" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "assigned_truck_id" uuid NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "driver_id" uuid NOT NULL,
        "truck_id" uuid NOT NULL,
        "trailer_number" varchar NOT NULL,
        "starting_place" varchar NOT NULL,
        "starting_km" integer NOT NULL,
        "ending_km" integer NULL,
        "total_km" decimal NULL,
        "start_time" timestamp NOT NULL,
        "end_time" timestamp NULL,
        "status" "trip_status_enum" NOT NULL DEFAULT 'CREATED',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "trip_stops" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "type" "stop_type_enum" NOT NULL,
        "location_name" varchar NOT NULL,
        "lat" decimal(10,8) NOT NULL,
        "lon" decimal(11,8) NOT NULL,
        "status" "stop_status_enum" NOT NULL DEFAULT 'PENDING',
        "completed_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tracking_positions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "truck_id" uuid NOT NULL,
        "trip_id" uuid NOT NULL,
        "lat" decimal(10,8) NOT NULL,
        "lon" decimal(11,8) NOT NULL,
        "speed" decimal(5,2) NOT NULL,
        "heading" decimal(5,2) NOT NULL,
        "accuracy" decimal(6,2) NOT NULL,
        "altitude" decimal(8,2) NULL,
        "timestamp" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "load_pickups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "stop_id" uuid NOT NULL,
        "lat" decimal(10,8) NOT NULL,
        "lon" decimal(11,8) NOT NULL,
        "km_reading" integer NOT NULL,
        "gps_accuracy" decimal(6,2) NOT NULL,
        "timestamp" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "delivery_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "stop_id" uuid NOT NULL,
        "place" varchar NOT NULL,
        "km_reading" integer NOT NULL,
        "labour_charges" decimal(10,2) NULL,
        "notes" text NULL,
        "timestamp" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fuel_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "truck_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "type" "fuel_type_enum" NOT NULL DEFAULT 'DIESEL',
        "litres" decimal(8,2) NOT NULL,
        "price_per_litre" decimal(6,3) NOT NULL,
        "total_cost" decimal(10,2) NOT NULL,
        "km_reading" integer NOT NULL,
        "location" varchar NOT NULL,
        "timestamp" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "adblue_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "truck_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "litres" decimal(8,2) NOT NULL,
        "cost" decimal(10,2) NOT NULL,
        "km_reading" integer NOT NULL,
        "location" varchar NOT NULL,
        "timestamp" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "truck_id" uuid NULL,
        "driver_id" uuid NULL,
        "type" "alert_type_enum" NOT NULL,
        "severity" "alert_severity_enum" NOT NULL,
        "message" varchar NOT NULL,
        "lat" decimal(10,8) NULL,
        "lon" decimal(11,8) NULL,
        "timestamp" timestamp NOT NULL,
        "resolved_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "geofences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" "geofence_type_enum" NOT NULL,
        "coordinates" jsonb NOT NULL,
        "radius_metres" integer NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pod_signatures" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_id" uuid NOT NULL,
        "file_path" varchar NOT NULL,
        "s3_url" varchar NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pod_photos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_id" uuid NOT NULL,
        "file_path" varchar NOT NULL,
        "s3_url" varchar NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL,
        "action" varchar NOT NULL,
        "entity" varchar NOT NULL,
        "entity_id" varchar NULL,
        "ip_address" varchar NOT NULL,
        "timestamp" timestamp NOT NULL
      )
    `);

    await queryRunner.query('CREATE INDEX "IDX_tracking_truck_timestamp" ON "tracking_positions" ("truck_id", "timestamp" DESC)');

    await queryRunner.query('ALTER TABLE "drivers" ADD CONSTRAINT "FK_drivers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "drivers" ADD CONSTRAINT "FK_drivers_truck" FOREIGN KEY ("assigned_truck_id") REFERENCES "trucks"("id") ON DELETE SET NULL');
    await queryRunner.query('ALTER TABLE "trucks" ADD CONSTRAINT "FK_trucks_driver" FOREIGN KEY ("assigned_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL');

    await queryRunner.query('ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT');
    await queryRunner.query('ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_truck" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT');

    await queryRunner.query('ALTER TABLE "trip_stops" ADD CONSTRAINT "FK_trip_stops_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "tracking_positions" ADD CONSTRAINT "FK_tracking_truck" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "tracking_positions" ADD CONSTRAINT "FK_tracking_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "load_pickups" ADD CONSTRAINT "FK_load_pickups_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "load_pickups" ADD CONSTRAINT "FK_load_pickups_stop" FOREIGN KEY ("stop_id") REFERENCES "trip_stops"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "delivery_records" ADD CONSTRAINT "FK_delivery_records_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "delivery_records" ADD CONSTRAINT "FK_delivery_records_stop" FOREIGN KEY ("stop_id") REFERENCES "trip_stops"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "fuel_logs" ADD CONSTRAINT "FK_fuel_logs_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "fuel_logs" ADD CONSTRAINT "FK_fuel_logs_truck" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "fuel_logs" ADD CONSTRAINT "FK_fuel_logs_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "adblue_logs" ADD CONSTRAINT "FK_adblue_logs_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "adblue_logs" ADD CONSTRAINT "FK_adblue_logs_truck" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "adblue_logs" ADD CONSTRAINT "FK_adblue_logs_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_truck" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE SET NULL');
    await queryRunner.query('ALTER TABLE "alerts" ADD CONSTRAINT "FK_alerts_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL');

    await queryRunner.query('ALTER TABLE "pod_signatures" ADD CONSTRAINT "FK_pod_signatures_delivery" FOREIGN KEY ("delivery_id") REFERENCES "delivery_records"("id") ON DELETE CASCADE');
    await queryRunner.query('ALTER TABLE "pod_photos" ADD CONSTRAINT "FK_pod_photos_delivery" FOREIGN KEY ("delivery_id") REFERENCES "delivery_records"("id") ON DELETE CASCADE');

    await queryRunner.query('ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"');
    await queryRunner.query('ALTER TABLE "pod_photos" DROP CONSTRAINT "FK_pod_photos_delivery"');
    await queryRunner.query('ALTER TABLE "pod_signatures" DROP CONSTRAINT "FK_pod_signatures_delivery"');
    await queryRunner.query('ALTER TABLE "alerts" DROP CONSTRAINT "FK_alerts_driver"');
    await queryRunner.query('ALTER TABLE "alerts" DROP CONSTRAINT "FK_alerts_truck"');
    await queryRunner.query('ALTER TABLE "adblue_logs" DROP CONSTRAINT "FK_adblue_logs_driver"');
    await queryRunner.query('ALTER TABLE "adblue_logs" DROP CONSTRAINT "FK_adblue_logs_truck"');
    await queryRunner.query('ALTER TABLE "adblue_logs" DROP CONSTRAINT "FK_adblue_logs_trip"');
    await queryRunner.query('ALTER TABLE "fuel_logs" DROP CONSTRAINT "FK_fuel_logs_driver"');
    await queryRunner.query('ALTER TABLE "fuel_logs" DROP CONSTRAINT "FK_fuel_logs_truck"');
    await queryRunner.query('ALTER TABLE "fuel_logs" DROP CONSTRAINT "FK_fuel_logs_trip"');
    await queryRunner.query('ALTER TABLE "delivery_records" DROP CONSTRAINT "FK_delivery_records_stop"');
    await queryRunner.query('ALTER TABLE "delivery_records" DROP CONSTRAINT "FK_delivery_records_trip"');
    await queryRunner.query('ALTER TABLE "load_pickups" DROP CONSTRAINT "FK_load_pickups_stop"');
    await queryRunner.query('ALTER TABLE "load_pickups" DROP CONSTRAINT "FK_load_pickups_trip"');
    await queryRunner.query('ALTER TABLE "tracking_positions" DROP CONSTRAINT "FK_tracking_trip"');
    await queryRunner.query('ALTER TABLE "tracking_positions" DROP CONSTRAINT "FK_tracking_truck"');
    await queryRunner.query('ALTER TABLE "trip_stops" DROP CONSTRAINT "FK_trip_stops_trip"');
    await queryRunner.query('ALTER TABLE "trips" DROP CONSTRAINT "FK_trips_truck"');
    await queryRunner.query('ALTER TABLE "trips" DROP CONSTRAINT "FK_trips_driver"');
    await queryRunner.query('ALTER TABLE "trucks" DROP CONSTRAINT "FK_trucks_driver"');
    await queryRunner.query('ALTER TABLE "drivers" DROP CONSTRAINT "FK_drivers_truck"');
    await queryRunner.query('ALTER TABLE "drivers" DROP CONSTRAINT "FK_drivers_user"');

    await queryRunner.query('DROP INDEX "IDX_tracking_truck_timestamp"');

    await queryRunner.query('DROP TABLE "audit_logs"');
    await queryRunner.query('DROP TABLE "pod_photos"');
    await queryRunner.query('DROP TABLE "pod_signatures"');
    await queryRunner.query('DROP TABLE "geofences"');
    await queryRunner.query('DROP TABLE "alerts"');
    await queryRunner.query('DROP TABLE "adblue_logs"');
    await queryRunner.query('DROP TABLE "fuel_logs"');
    await queryRunner.query('DROP TABLE "delivery_records"');
    await queryRunner.query('DROP TABLE "load_pickups"');
    await queryRunner.query('DROP TABLE "tracking_positions"');
    await queryRunner.query('DROP TABLE "trip_stops"');
    await queryRunner.query('DROP TABLE "trips"');
    await queryRunner.query('DROP TABLE "drivers"');
    await queryRunner.query('DROP TABLE "trucks"');
    await queryRunner.query('DROP TABLE "users"');

    await queryRunner.query('DROP TYPE "geofence_type_enum"');
    await queryRunner.query('DROP TYPE "alert_severity_enum"');
    await queryRunner.query('DROP TYPE "alert_type_enum"');
    await queryRunner.query('DROP TYPE "fuel_type_enum"');
    await queryRunner.query('DROP TYPE "stop_status_enum"');
    await queryRunner.query('DROP TYPE "stop_type_enum"');
    await queryRunner.query('DROP TYPE "trip_status_enum"');
    await queryRunner.query('DROP TYPE "truck_status_enum"');
    await queryRunner.query('DROP TYPE "user_role_enum"');
  }
}
