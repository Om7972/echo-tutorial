import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/caching/redis';

export async function GET() {
  const startTime = Date.now();

  const services = {
    convex: 'unknown' as 'healthy' | 'degraded' | 'unknown',
    redis: 'unknown' as 'healthy' | 'degraded' | 'unknown',
    openai: 'unknown' as 'healthy' | 'degraded' | 'unknown',
    anthropic: 'unknown' as 'healthy' | 'degraded' | 'unknown',
    resend: 'unknown' as 'healthy' | 'degraded' | 'unknown',
    clerk: 'unknown' as 'healthy' | 'degraded' | 'unknown',
  };

  try {
    // Check Convex connection
    if (process.env.NEXT_PUBLIC_CONVEX_URL) {
      services.convex = 'healthy';
    } else {
      services.convex = 'degraded';
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      await redis.ping();
      services.redis = 'healthy';
    } catch (error) {
      services.redis = 'degraded';
    }

    // Check OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      services.openai = 'healthy';
    } else {
      services.openai = 'degraded';
    }

    // Check Anthropic API key (optional)
    if (process.env.ANTHROPIC_API_KEY) {
      services.anthropic = 'healthy';
    } else {
      services.anthropic = 'degraded';
    }

    // Check Resend API key
    if (process.env.RESEND_API_KEY) {
      services.resend = 'healthy';
    } else {
      services.resend = 'degraded';
    }

    // Check Clerk keys
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
      services.clerk = 'healthy';
    } else {
      services.clerk = 'degraded';
    }

    const criticalServices = ['convex', 'clerk'];
    const criticalHealthy = criticalServices.every(
      (service) => services[service as keyof typeof services] === 'healthy'
    );
    const allHealthy = Object.values(services).every((s) => s === 'healthy');
    
    const status = criticalHealthy ? (allHealthy ? 'healthy' : 'degraded') : 'unhealthy';

    const health = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      responseTime: Date.now() - startTime,
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(health, { 
      status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
