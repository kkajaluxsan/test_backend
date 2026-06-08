import { Module } from '@nestjs/common';
import { GeofencesController } from './geofences.controller';

// TODO (Phase 2): Implement geofence zone manager — admin CRUD for zones
// - GET/POST/PATCH/DELETE /api/geofences
// - Wire GEOFENCE_ENTRY / GEOFENCE_EXIT alerts from TrackingService
@Module({
  controllers: [GeofencesController],
})
export class GeofencesModule {}
