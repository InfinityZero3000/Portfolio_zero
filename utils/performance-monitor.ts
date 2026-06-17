/**
 * Performance monitoring and optimization utilities
 * Tracks metrics and provides insights for optimization
 */

interface PerformanceMetrics {
  fps: number;
  memory: number;
  loadTime: number;
  renderTime: number;
  interactionTime: number;
}

interface PerformanceEntry {
  timestamp: number;
  metrics: PerformanceMetrics;
}

class PerformanceMonitor {
  private metrics: PerformanceEntry[] = [];
  private maxEntries = 100;
  private fpsFrames: number[] = [];
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private isRunning = false;

  constructor() {
    // FPS monitoring is started lazily on first call to getCurrentFPS()
    // to avoid a perpetual 60fps rAF loop at module import time.
  }

  /**
   * Start monitoring FPS
   */
  private startFPSMonitoring(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const measureFPS = (timestamp: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        // Tab hidden — cancel rAF entirely; visibilitychange will restart it
        this.rafId = null;
        return;
      }

      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime;
        const fps = 1000 / delta;
        this.fpsFrames.push(fps);
        if (this.fpsFrames.length > 60) {
          this.fpsFrames.shift();
        }
      }

      this.lastFrameTime = timestamp;
      this.rafId = requestAnimationFrame(measureFPS);
    };

    this.rafId = requestAnimationFrame(measureFPS);

    if (typeof document !== 'undefined' && !this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (document.hidden) {
          // Cancel any pending rAF when tab goes hidden
          if (this.rafId != null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
          }
        } else {
          // Tab became visible again — restart loop
          this.lastFrameTime = 0;
          if (this.isRunning && this.rafId == null) {
            this.rafId = requestAnimationFrame(measureFPS);
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Get current FPS — lazily starts monitoring on first call.
   */
  public getCurrentFPS(): number {
    if (!this.isRunning && typeof window !== 'undefined') {
      this.startFPSMonitoring();
    }
    if (this.fpsFrames.length === 0) return 0;
    const sum = this.fpsFrames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsFrames.length);
  }

  /**
   * Get memory usage (if available)
   */
  public getMemoryUsage(): number {
    const perf = performance as any;
    if (perf.memory) {
      return Math.round(perf.memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }

  /**
   * Record performance metrics
   */
  public recordMetrics(): void {
    const metrics: PerformanceMetrics = {
      fps: this.getCurrentFPS(),
      memory: this.getMemoryUsage(),
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
      interactionTime: this.getInteractionTime(),
    };

    this.metrics.push({
      timestamp: Date.now(),
      metrics,
    });

    // Limit stored metrics
    if (this.metrics.length > this.maxEntries) {
      this.metrics.shift();
    }
  }

  /**
   * Get page load time
   */
  private getLoadTime(): number {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      return Math.round(navTiming.loadEventEnd - navTiming.fetchStart);
    }
    return 0;
  }

  /**
   * Get render time
   */
  private getRenderTime(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : 0;
  }

  /**
   * Get interaction time
   */
  private getInteractionTime(): number {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      return Math.round(navTiming.domInteractive - navTiming.fetchStart);
    }
    return 0;
  }

  /**
   * Get performance summary
   */
  public getSummary() {
    if (this.metrics.length === 0) {
      this.recordMetrics();
    }

    const recent = this.metrics.slice(-10);
    const avgFPS = recent.reduce((sum, e) => sum + e.metrics.fps, 0) / recent.length;
    const avgMemory = recent.reduce((sum, e) => sum + e.metrics.memory, 0) / recent.length;

    return {
      averageFPS: Math.round(avgFPS),
      currentFPS: this.getCurrentFPS(),
      averageMemory: Math.round(avgMemory),
      currentMemory: this.getMemoryUsage(),
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
      interactionTime: this.getInteractionTime(),
      performanceScore: this.calculatePerformanceScore(avgFPS, avgMemory),
    };
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculatePerformanceScore(fps: number, memory: number): number {
    let score = 100;

    // FPS scoring (target 60 FPS)
    if (fps < 30) score -= 30;
    else if (fps < 45) score -= 15;
    else if (fps < 55) score -= 5;

    // Memory scoring (penalize high usage)
    if (memory > 500) score -= 30;
    else if (memory > 300) score -= 15;
    else if (memory > 200) score -= 5;

    // Load time scoring
    const loadTime = this.getLoadTime();
    if (loadTime > 5000) score -= 20;
    else if (loadTime > 3000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): string[] {
    const summary = this.getSummary();
    const recommendations: string[] = [];

    if (summary.averageFPS < 30) {
      recommendations.push('Low FPS detected. Consider reducing visual effects or globe complexity.');
    }

    if (summary.currentMemory > 300) {
      recommendations.push('High memory usage. Clear caches or reduce asset quality.');
    }

    if (summary.loadTime > 3000) {
      recommendations.push('Slow load time. Enable asset preloading or use CDN.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is good!');
    }

    return recommendations;
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.isRunning = false;
  }

  /**
   * Export metrics for analysis
   */
  public exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

const isDev = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

// Auto-record metrics every 5 seconds in development only.
// Save the ID so Vite HMR can clear the previous interval on hot reload.
let _devMetricsInterval: ReturnType<typeof setInterval> | undefined;
if (typeof window !== 'undefined' && isDev) {
  if ((window as any).__devMetricsInterval) clearInterval((window as any).__devMetricsInterval);
  _devMetricsInterval = setInterval(() => { performanceMonitor.recordMetrics(); }, 5000);
  (window as any).__devMetricsInterval = _devMetricsInterval;
}

// Report performance on page unload in development only
if (typeof window !== 'undefined' && isDev) {
  window.addEventListener('beforeunload', () => {
    const summary = performanceMonitor.getSummary();
    console.log('Performance Summary:', summary);
    console.log('Recommendations:', performanceMonitor.getRecommendations());
  });
}

export default PerformanceMonitor;
