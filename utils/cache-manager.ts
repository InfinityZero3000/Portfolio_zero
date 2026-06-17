/**
 * Advanced caching system for assets and data
 * Supports IndexedDB for large assets and localStorage for small data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'indexedDB';
  compress?: boolean;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private dbName = 'portfolio_cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    // IndexedDB is initialised lazily the first time it is actually needed
  }

  /**
   * Initialize IndexedDB for large asset caching (called lazily)
   */
  private async initIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Set cache entry
   */
  public async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = 24 * 60 * 60 * 1000, // Default 24 hours
      storage = 'memory',
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      size: this.estimateSize(data),
    };

    switch (storage) {
      case 'memory':
        this.memoryCache.set(key, entry);
        break;
      
      case 'localStorage':
        try {
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
          console.warn('localStorage quota exceeded:', e);
          // Fallback to memory
          this.memoryCache.set(key, entry);
        }
        break;
      
      case 'indexedDB':
        await this.setIndexedDB(key, entry);
        break;
    }
  }

  /**
   * Get cache entry
   */
  public async get<T>(
    key: string,
    storage: 'memory' | 'localStorage' | 'indexedDB' = 'memory'
  ): Promise<T | null> {
    let entry: CacheEntry<T> | null = null;

    switch (storage) {
      case 'memory':
        entry = this.memoryCache.get(key) || null;
        break;
      
      case 'localStorage':
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            entry = JSON.parse(stored);
          }
        } catch (e) {
          console.warn('Failed to parse localStorage entry:', e);
        }
        break;
      
      case 'indexedDB':
        entry = await this.getIndexedDB<T>(key);
        break;
    }

    // Check if entry exists and is not expired
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      await this.delete(key, storage);
      return null;
    }

    return entry.data;
  }

  /**
   * Delete cache entry
   */
  public async delete(
    key: string,
    storage: 'memory' | 'localStorage' | 'indexedDB' = 'memory'
  ): Promise<void> {
    switch (storage) {
      case 'memory':
        this.memoryCache.delete(key);
        break;
      
      case 'localStorage':
        localStorage.removeItem(key);
        break;
      
      case 'indexedDB':
        await this.deleteIndexedDB(key);
        break;
    }
  }

  /**
   * Clear all caches
   */
  public async clear(): Promise<void> {
    this.memoryCache.clear();
    localStorage.clear();
    
    if (this.db) {
      const transaction = this.db.transaction(['assets'], 'readwrite');
      const store = transaction.objectStore('assets');
      store.clear();
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const memorySize = Array.from(this.memoryCache.values())
      .reduce((acc, entry) => acc + entry.size, 0);

    return {
      memoryEntries: this.memoryCache.size,
      memorySize,
      memoryLimit: 50 * 1024 * 1024, // 50MB soft limit
    };
  }

  /**
   * Evict old entries if cache is too large
   */
  public evictOldEntries(): void {
    const stats = this.getStats();
    if (stats.memorySize > stats.memoryLimit) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 25% of entries
      const toRemove = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  // IndexedDB helpers
  private async setIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readwrite');
      const store = transaction.objectStore('assets');
      const request = store.put({ key, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }
    
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readonly');
      const store = transaction.objectStore('assets');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key: _, ...entry } = result;
          resolve(entry as CacheEntry<T>);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readwrite');
      const store = transaction.objectStore('assets');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Estimate data size in bytes
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default CacheManager;
