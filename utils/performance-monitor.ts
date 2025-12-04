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

  constructor() {
    this.startFPSMonitoring();
  }

  /**
   * Start monitoring FPS
   */
  private startFPSMonitoring(): void {
    const measureFPS = (timestamp: number) => {
      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime;
        const fps = 1000 / delta;
        this.fpsFrames.push(fps);
        
        // Keep only last 60 frames
        if (this.fpsFrames.length > 60) {
          this.fpsFrames.shift();
        }
      }
      
      this.lastFrameTime = timestamp;
      this.rafId = requestAnimationFrame(measureFPS);
    };

    this.rafId = requestAnimationFrame(measureFPS);
  }

  /**
   * Get current FPS
   */
  public getCurrentFPS(): number {
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

// Auto-record metrics every 5 seconds
setInterval(() => {
  performanceMonitor.recordMetrics();
}, 5000);

// Report performance on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const summary = performanceMonitor.getSummary();
    console.log('Performance Summary:', summary);
    console.log('Recommendations:', performanceMonitor.getRecommendations());
  });
}

export default PerformanceMonitor;
