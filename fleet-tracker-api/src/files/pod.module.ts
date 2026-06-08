import { Module } from '@nestjs/common';
import { PodController } from './pod.controller';

// TODO (Phase 2): Implement POD module — signature + photo upload to AWS S3
// - POST /api/pod/signature
// - POST /api/pod/photo
// - Link to delivery_records via delivery_id
@Module({
  controllers: [PodController],
})
export class PodModule {}
