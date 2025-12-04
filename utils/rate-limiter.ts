/**
 * Client-side rate limiter để giảm tải và chống spam requests
 * Sử dụng sliding window algorithm với localStorage
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key: string;
}

interface RequestRecord {
  timestamps: number[];
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private storageKey: string;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.storageKey = `rate_limit_${config.key}`;
  }

  /**
   * Check if request is allowed based on rate limit
   */
  public isAllowed(): boolean {
    const now = Date.now();
    const record = this.getRecord();

    // Check if currently blocked
    if (record.blocked && record.blockedUntil && record.blockedUntil > now) {
      return false;
    }

    // Clean old timestamps outside the window
    const windowStart = now - this.config.windowMs;
    record.timestamps = record.timestamps.filter(t => t > windowStart);

    // Check if limit exceeded
    if (record.timestamps.length >= this.config.maxRequests) {
      // Block for 5 minutes
      record.blocked = true;
      record.blockedUntil = now + 5 * 60 * 1000;
      this.saveRecord(record);
      return false;
    }

    // Add new timestamp and allow request
    record.timestamps.push(now);
    record.blocked = false;
    this.saveRecord(record);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  public getRemainingRequests(): number {
    const record = this.getRecord();
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const recentTimestamps = record.timestamps.filter(t => t > windowStart);
    return Math.max(0, this.config.maxRequests - recentTimestamps.length);
  }

  /**
   * Reset rate limit
   */
  public reset(): void {
    localStorage.removeItem(this.storageKey);
  }

  private getRecord(): RequestRecord {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse rate limit record:', e);
    }
    return { timestamps: [], blocked: false };
  }

  private saveRecord(record: RequestRecord): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(record));
    } catch (e) {
      console.warn('Failed to save rate limit record:', e);
    }
  }
}

// Pre-configured rate limiters for different operations
export const apiRateLimiter = new RateLimiter({
  key: 'api_calls',
  maxRequests: 30,
  windowMs: 60 * 1000, // 30 requests per minute
});

export const resourceRateLimiter = new RateLimiter({
  key: 'resource_loads',
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 resource loads per minute
});

export default RateLimiter;
