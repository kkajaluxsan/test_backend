import { io, Socket } from 'socket.io-client';
import { getStoredTokens, clearStoredAuth } from '../api/client';
import type {
  AlertFiredEvent,
  TruckPositionEvent,
  TripUpdatedEvent,
} from '../types';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

type Listeners = {
  status: Set<(status: WsStatus) => void>;
  truckPosition: Set<(data: TruckPositionEvent) => void>;
  alertFired: Set<(data: AlertFiredEvent) => void>;
  sosTriggered: Set<(data: unknown) => void>;
  truckOffline: Set<(data: { truckId: string; lastSeen: string }) => void>;
  truckIdle: Set<(data: { truckId: string; idleMinutes: number; lat: number; lon: number }) => void>;
  tripUpdated: Set<(data: TripUpdatedEvent) => void>;
};

class FleetSocket {
  private socket: Socket | null = null;
  private listeners: Listeners = {
    status: new Set(),
    truckPosition: new Set(),
    alertFired: new Set(),
    sosTriggered: new Set(),
    truckOffline: new Set(),
    truckIdle: new Set(),
    tripUpdated: new Set(),
  };

  connect() {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    this.disconnect();
    this.emitStatus('connecting');

    this.socket = io(WS_URL, {
      path: '/ws',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => this.emitStatus('connected'));
    this.socket.on('disconnect', () => this.emitStatus('disconnected'));
    this.socket.on('connect_error', () => this.emitStatus('disconnected'));

    this.socket.on('TRUCK_POSITION', (data: TruckPositionEvent) => {
      this.listeners.truckPosition.forEach((fn) => fn(data));
    });
    this.socket.on('ALERT_FIRED', (data: AlertFiredEvent) => {
      this.listeners.alertFired.forEach((fn) => fn(data));
    });
    this.socket.on('SOS_TRIGGERED', (data: unknown) => {
      this.listeners.sosTriggered.forEach((fn) => fn(data));
    });
    this.socket.on('TRUCK_OFFLINE', (data: { truckId: string; lastSeen: string }) => {
      this.listeners.truckOffline.forEach((fn) => fn(data));
    });
    this.socket.on('TRUCK_IDLE', (data: { truckId: string; idleMinutes: number; lat: number; lon: number }) => {
      this.listeners.truckIdle.forEach((fn) => fn(data));
    });
    this.socket.on('TRIP_UPDATED', (data: TripUpdatedEvent) => {
      this.listeners.tripUpdated.forEach((fn) => fn(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.emitStatus('disconnected');
  }

  onStatus(fn: (status: WsStatus) => void) {
    this.listeners.status.add(fn);
    return () => this.listeners.status.delete(fn);
  }

  onTruckPosition(fn: (data: TruckPositionEvent) => void) {
    this.listeners.truckPosition.add(fn);
    return () => this.listeners.truckPosition.delete(fn);
  }

  onAlertFired(fn: (data: AlertFiredEvent) => void) {
    this.listeners.alertFired.add(fn);
    return () => this.listeners.alertFired.delete(fn);
  }

  onSosTriggered(fn: (data: unknown) => void) {
    this.listeners.sosTriggered.add(fn);
    return () => this.listeners.sosTriggered.delete(fn);
  }

  onTruckOffline(fn: (data: { truckId: string; lastSeen: string }) => void) {
    this.listeners.truckOffline.add(fn);
    return () => this.listeners.truckOffline.delete(fn);
  }

  onTripUpdated(fn: (data: TripUpdatedEvent) => void) {
    this.listeners.tripUpdated.add(fn);
    return () => this.listeners.tripUpdated.delete(fn);
  }

  getStatus(): WsStatus {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'connecting';
  }

  private emitStatus(status: WsStatus) {
    this.listeners.status.forEach((fn) => fn(status));
  }
}

export const fleetSocket = new FleetSocket();

export function logoutAndDisconnect() {
  fleetSocket.disconnect();
  clearStoredAuth();
}
