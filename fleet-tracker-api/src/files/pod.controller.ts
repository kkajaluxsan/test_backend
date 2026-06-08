import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// TODO (Phase 2): Proof of Delivery uploads (signature + photo) to S3
@ApiTags('POD (Phase 2)')
@Controller('pod')
export class PodController {}
