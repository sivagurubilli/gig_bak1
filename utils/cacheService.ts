interface CacheItem<T> {
  data: T;
  expiresAt: number;
  hits: number;
}

interface CacheStats {
  totalItems: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0
  };

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      data,
      expiresAt,
      hits: 0
    });
    this.stats.sets++;
    
    // Clean expired items periodically
    if (this.stats.sets % 100 === 0) {
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    item.hits++;
    this.stats.hits++;
    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      totalItems: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      memoryUsage: this.getMemoryUsage()
    };
  }

  private getMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2; // Rough string size
      size += JSON.stringify(item.data).length * 2; // Data size
      size += 32; // Overhead
    }
    return size;
  }
}

class CacheService {
  private cache = new MemoryCache();

  // Cache keys generators
  private getCacheKey(type: string, ...params: (string | number)[]): string {
    return `${type}:${params.join(':')}`;
  }

  // User-related caching
  async cacheUser(userId: string, userData: any, ttl: number = 300): Promise<void> {
    const key = this.getCacheKey('user', userId);
    this.cache.set(key, userData, ttl);
  }

  async getCachedUser(userId: string): Promise<any | null> {
    const key = this.getCacheKey('user', userId);
    return this.cache.get(key);
  }

  async invalidateUser(userId: string): Promise<void> {
    const pattern = `user:${userId}`;
    this.cache.invalidatePattern(pattern);
  }

  // Leaderboard caching
  async cacheLeaderboard(type: string, period: string, data: any, ttl: number = 60): Promise<void> {
    const key = this.getCacheKey('leaderboard', type, period);
    this.cache.set(key, data, ttl);
  }

  async getCachedLeaderboard(type: string, period: string): Promise<any | null> {
    const key = this.getCacheKey('leaderboard', type, period);
    return this.cache.get(key);
  }

  async invalidateLeaderboards(): Promise<void> {
    this.cache.invalidatePattern('leaderboard');
  }

  // Coin packages caching
  async cacheCoinPackages(packages: any[], ttl: number = 3600): Promise<void> {
    const key = this.getCacheKey('coin_packages');
    this.cache.set(key, packages, ttl);
  }

  async getCachedCoinPackages(): Promise<any[] | null> {
    const key = this.getCacheKey('coin_packages');
    return this.cache.get(key);
  }

  async invalidateCoinPackages(): Promise<void> {
    this.cache.delete(this.getCacheKey('coin_packages'));
  }

  // Gifts caching
  async cacheGifts(gifts: any[], ttl: number = 1800): Promise<void> {
    const key = this.getCacheKey('gifts');
    this.cache.set(key, gifts, ttl);
  }

  async getCachedGifts(): Promise<any[] | null> {
    const key = this.getCacheKey('gifts');
    return this.cache.get(key);
  }

  async invalidateGifts(): Promise<void> {
    this.cache.delete(this.getCacheKey('gifts'));
  }

  // Wallet caching
  async cacheWallet(userId: string, walletData: any, ttl: number = 60): Promise<void> {
    const key = this.getCacheKey('wallet', userId);
    this.cache.set(key, walletData, ttl);
  }

  async getCachedWallet(userId: string): Promise<any | null> {
    const key = this.getCacheKey('wallet', userId);
    return this.cache.get(key);
  }

  async invalidateWallet(userId: string): Promise<void> {
    const pattern = `wallet:${userId}`;
    this.cache.invalidatePattern(pattern);
  }

  // Transaction caching
  async cacheTransactions(userId: string, page: number, transactions: any[], ttl: number = 300): Promise<void> {
    const key = this.getCacheKey('transactions', userId, page.toString());
    this.cache.set(key, transactions, ttl);
  }

  async getCachedTransactions(userId: string, page: number): Promise<any[] | null> {
    const key = this.getCacheKey('transactions', userId, page.toString());
    return this.cache.get(key);
  }

  async invalidateTransactions(userId: string): Promise<void> {
    const pattern = `transactions:${userId}`;
    this.cache.invalidatePattern(pattern);
  }

  // Session caching for OTP
  async cacheOTPSession(sessionKey: string, sessionData: any, ttl: number = 600): Promise<void> {
    const key = this.getCacheKey('otp_session', sessionKey);
    this.cache.set(key, sessionData, ttl);
  }

  async getCachedOTPSession(sessionKey: string): Promise<any | null> {
    const key = this.getCacheKey('otp_session', sessionKey);
    return this.cache.get(key);
  }

  async invalidateOTPSession(sessionKey: string): Promise<void> {
    const key = this.getCacheKey('otp_session', sessionKey);
    this.cache.delete(key);
  }

  // General cache management
  async getStats(): Promise<CacheStats> {
    return this.cache.getStats();
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
  }

  async clearExpired(): Promise<void> {
    // Trigger cleanup
    this.cache.set('_cleanup_trigger', true, 1);
    this.cache.get('_cleanup_trigger');
    this.cache.delete('_cleanup_trigger');
  }

  // Rate limiting cache
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getCacheKey('rate_limit', identifier);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    let rateLimitData = this.cache.get<{ count: number; windowStart: number }>(key);
    
    if (!rateLimitData || (now - rateLimitData.windowStart) > windowMs) {
      // New window
      rateLimitData = {
        count: 1,
        windowStart: now
      };
      this.cache.set(key, rateLimitData, windowSeconds);
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs
      };
    }
    
    rateLimitData.count++;
    this.cache.set(key, rateLimitData, windowSeconds);
    
    const allowed = rateLimitData.count <= limit;
    const remaining = Math.max(0, limit - rateLimitData.count);
    const resetTime = rateLimitData.windowStart + windowMs;
    
    return { allowed, remaining, resetTime };
  }
}

export const cacheService = new CacheService();