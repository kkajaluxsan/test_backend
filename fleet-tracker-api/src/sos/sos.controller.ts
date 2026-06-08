import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// TODO (Phase 2): POST /api/sos — driver SOS trigger with GPS coordinates
@ApiTags('SOS (Phase 2)')
@Controller('sos')
export class SosController {}
