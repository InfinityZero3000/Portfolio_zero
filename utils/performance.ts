// Utility functions for performance optimization

/**
 * Debounce function - delays execution until after wait time has passed since last call
 * Use for: search inputs, form validation, window resize
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Throttle function - ensures function executes at most once per interval
 * Use for: scroll events, mouse move, API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      lastResult = func.apply(context, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Request Animation Frame throttle - executes function at most once per frame
 * Use for: animations, scroll effects, visual updates
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(context, args);
        rafId = null;
      });
    }
  };
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  options: IntersectionObserverInit = {}
): void {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  };

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const lazyImage = entry.target as HTMLImageElement;
        const src = lazyImage.dataset.src;
        
        if (src) {
          lazyImage.src = src;
          lazyImage.classList.add('loaded');
          observer.unobserve(lazyImage);
        }
      }
    });
  }, defaultOptions);

  imageObserver.observe(img);
}

/**
 * Memory-efficient memoization with LRU cache
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>();
  const keys: string[] = [];

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func.apply(this, args);
    
    cache.set(key, result);
    keys.push(key);

    // LRU eviction
    if (keys.length > maxSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    return result;
  } as T;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get network quality information
 */
export function getNetworkQuality(): 'slow' | 'fast' | 'unknown' {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  if (!connection) return 'unknown';

  // 4g or faster
  if (connection.effectiveType === '4g' || connection.effectiveType === '5g') {
    return 'fast';
  }

  // 2g, 3g, or slow-2g
  return 'slow';
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 0;
  
  // Check memory (if available)
  const memory = (navigator as any).deviceMemory || 8; // Default to 8GB if unknown
  
  return cores <= 2 || memory <= 2;
}

/**
 * Adaptive performance settings based on device capabilities
 */
export interface PerformanceSettings {
  enableAnimations: boolean;
  enableParticles: boolean;
  textureQuality: 'high' | 'medium' | 'low';
  maxPolygons: number;
}

export function getAdaptivePerformanceSettings(): PerformanceSettings {
  const isLowEnd = isLowEndDevice();
  const networkQuality = getNetworkQuality();
  const reducedMotion = prefersReducedMotion();

  return {
    enableAnimations: !reducedMotion && !isLowEnd,
    enableParticles: !isLowEnd && networkQuality !== 'slow',
    textureQuality: isLowEnd ? 'low' : networkQuality === 'slow' ? 'medium' : 'high',
    maxPolygons: isLowEnd ? 1000 : 5000
  };
}
