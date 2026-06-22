import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/caching/redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  keyPrefix: 'rate-limit:',
};

export async function rateLimit(request: NextRequest, config: Partial<RateLimitConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  const client = getRedisClient();
  
  const identifier = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';
  const key = `${cfg.keyPrefix}${identifier}`;
  
  const current = await client.incr(key);
  
  if (current === 1) {
    await client.expire(key, Math.floor(cfg.windowMs / 1000));
  }
  
  if (current > cfg.max) {
    const ttl = await client.ttl(key);
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': ttl.toString(),
          'X-RateLimit-Limit': cfg.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + ttl * 1000).toString(),
        },
      }
    );
  }
  
  return NextResponse.next();
}
