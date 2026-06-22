import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/caching/redis';

export async function GET() {
  const startTime = Date.now();

  try {
    // Check Redis connection
    const redis = getRedisClient();
    await redis.ping();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: 'healthy',
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
