import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const client = new Redis(
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          },
        );
        client.on('error', () => {
          // Suppress unhandled error events when Redis is unavailable in dev
        });
        client.connect().catch(() => undefined);
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
