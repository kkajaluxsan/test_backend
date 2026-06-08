import { Module } from '@nestjs/common';
import { SosController } from './sos.controller';

// TODO (Phase 2): Implement SOS endpoint — POST /api/sos
// - Accept SOS trigger from driver app
// - Create CRITICAL severity alert via AlertsService
// - Integrate Twilio SMS for admin notification
@Module({
  controllers: [SosController],
})
export class SosModule {}
