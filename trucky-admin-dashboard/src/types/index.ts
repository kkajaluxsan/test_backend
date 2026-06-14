export type UserRole = 'SUPER_ADMIN' | 'FLEET_MANAGER' | 'DRIVER';
export type TruckStatus = 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'MAINTENANCE';
export type TripStatus =
  | 'CREATED'
  | 'ROUTE_PLANNED'
  | 'IN_PROGRESS'
  | 'DELIVERING'
  | 'COMPLETED';
export type StopType = 'LOAD_PICKUP' | 'DELIVERY';
export type StopStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED';
export type FuelEntryType = 'DIESEL' | 'ADBLUE';
export type AlertType =
  | 'SOS'
  | 'OFFLINE'
  | 'OVERSPEED'
  | 'IDLE'
  | 'LOW_FUEL'
  | 'LOW_ADBLUE'
  | 'GEOFENCE_ENTRY'
  | 'GEOFENCE_EXIT';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  name?: string;
}

export interface AuthUser extends User {
  assignedTruckId?: string | null;
  assignedTruckNumber?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface DashboardSummary {
  totalTrucks: number;
  activeTrucks: number;
  idleTrucks: number;
  offlineTrucks: number;
  todayFleetKm: number;
  monthFleetKm: number;
  activeAlerts: number;
  fuelAlerts: number;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  licenseNumber: string;
  phone: string;
  assignedTruckId?: string | null;
  assignedTruck?: Truck | null;
  user?: User;
}

export interface Truck {
  id: string;
  registrationNumber: string;
  trailerNumber?: string | null;
  status: TruckStatus;
  assignedDriverId?: string | null;
  assignedDriver?: Driver | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LivePosition {
  truckId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  lastUpdate: string;
}

export interface TripStop {
  id: string;
  tripId: string;
  sequence: number;
  type: StopType;
  locationName: string;
  lat: number;
  lon: number;
  status: StopStatus;
}

export interface LoadPickup {
  id: string;
  tripId: string;
  stopId: string;
  lat: number;
  lon: number;
  kmReading: number;
  gpsAccuracy?: number;
  timestamp: string;
}

export interface DeliveryRecord {
  id: string;
  tripId: string;
  stopId: string;
  place: string;
  kmReading: number;
  labourCharges?: number;
  notes?: string;
  timestamp: string;
}

export interface Trip {
  id: string;
  driverId: string;
  truckId: string;
  startingPlace: string;
  startingKm: number;
  endingKm?: number | null;
  totalKm?: number | null;
  startTime: string;
  endTime?: string | null;
  status: TripStatus;
  driver?: Driver;
  truck?: Truck;
  stops?: TripStop[];
  loadPickups?: LoadPickup[];
  deliveryRecords?: DeliveryRecord[];
}

export interface RoutePoint {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface FuelEntry {
  id: string;
  type: FuelEntryType;
  tripId: string;
  truckId: string;
  driverId: string;
  litres: number;
  pricePerLitre?: number;
  totalCost?: number;
  cost?: number;
  kmReading: number;
  location: string;
  timestamp: string;
  driver?: Driver;
  truck?: Truck;
}

export interface FuelKpis {
  totalLitres: number;
  totalCost: number;
  avgLitresPer100km: number;
  adblueTotal: number;
  adblueCost: number;
  adblueConsumptionRate: number;
}

export interface Alert {
  id: string;
  truckId: string;
  driverId?: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  lat?: number | null;
  lon?: number | null;
  timestamp: string;
  resolvedAt?: string | null;
  truck?: Truck;
  driver?: Driver;
}

export interface TruckPositionEvent {
  truckId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  bearing?: number;
  lastUpdate: string;
}

export interface AlertFiredEvent {
  alertType: AlertType;
  severity: AlertSeverity;
  truckId: string;
  driverId?: string;
  message: string;
  lat?: number;
  lon?: number;
}

export interface TripUpdatedEvent {
  tripId: string;
  status: TripStatus;
  currentStop?: string;
  driverId: string;
}

export type ReportType = 'daily' | 'monthly' | 'custom' | 'fuel' | 'trips';
export type ReportFormat = 'json' | 'pdf' | 'csv';
