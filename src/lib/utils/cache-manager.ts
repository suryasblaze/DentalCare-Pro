/**
 * Simple cache manager for API data
 */
export class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }>;
  private defaultTTL: number;

  /**
   * Creates a new cache manager
   * @param defaultTTL Default time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(defaultTTL = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Sets a cache entry
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional custom TTL in milliseconds
   */
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  /**
   * Gets a cache entry if it exists and is not expired
   * @param key Cache key
   * @returns Cached data or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (entry.timestamp < Date.now()) {
      this.invalidate(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  /**
   * Invalidates a specific cache entry
   * @param key Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries matching a pattern
   * @param pattern Regex pattern to match against keys
   */
  invalidatePattern(pattern: RegExp): void {
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        this.invalidate(key);
      }
    });
  }

  /**
   * Invalidates all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const globalCache = new CacheManager();