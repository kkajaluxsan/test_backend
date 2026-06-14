import { useEffect, useState } from 'react';
import { fleetSocket } from '../ws/fleet-socket';
import type { TruckPositionEvent } from '../types';

export function useLivePositions() {
  const [positions, setPositions] = useState<Record<string, TruckPositionEvent>>({});

  useEffect(() => {
    const unsub = fleetSocket.onTruckPosition((data) => {
      setPositions((prev) => ({ ...prev, [data.truckId]: data }));
    });
    return () => {
      unsub();
    };
  }, []);

  return positions;
}

export function useWsReconnect(onReconnect: () => void) {
  useEffect(() => {
    let wasConnected = false;
    const unsub = fleetSocket.onStatus((status) => {
      if (status === 'connected' && wasConnected) {
        onReconnect();
      }
      if (status === 'connected') wasConnected = true;
    });
    return () => {
      unsub();
    };
  }, [onReconnect]);
}
