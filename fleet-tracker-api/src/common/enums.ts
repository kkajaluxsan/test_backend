export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FLEET_MANAGER = 'FLEET_MANAGER',
  DRIVER = 'DRIVER',
}

export enum TruckStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum TripStatus {
  CREATED = 'CREATED',
  ROUTE_PLANNED = 'ROUTE_PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
}

export enum StopType {
  LOAD_PICKUP = 'LOAD_PICKUP',
  DELIVERY = 'DELIVERY',
}

export enum StopStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
}

export enum FuelType {
  DIESEL = 'DIESEL',
}

export enum AlertType {
  SOS = 'SOS',
  OFFLINE = 'OFFLINE',
  OVERSPEED = 'OVERSPEED',
  IDLE = 'IDLE',
  LOW_FUEL = 'LOW_FUEL',
  LOW_ADBLUE = 'LOW_ADBLUE',
  GEOFENCE_ENTRY = 'GEOFENCE_ENTRY',
  GEOFENCE_EXIT = 'GEOFENCE_EXIT',
}

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum GeofenceType {
  CIRCLE = 'CIRCLE',
  POLYGON = 'POLYGON',
}
