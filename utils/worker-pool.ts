/**
 * Web Worker for offloading heavy computations from main thread
 * Improves responsiveness and prevents UI blocking
 */

interface WorkerTask {
  id: string;
  type: 'processGeoData' | 'calculatePoints' | 'optimizeGeometry';
  payload: any;
}

interface WorkerResponse {
  id: string;
  result: any;
  error?: string;
}

// Worker pool manager
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{ task: WorkerTask; resolve: Function; reject: Function }> = [];
  private maxWorkers: number;

  constructor(workerScript: string, maxWorkers: number = navigator.hardwareConcurrency || 2) {
    this.maxWorkers = Math.min(maxWorkers, 4); // Cap at 4 workers
    this.initWorkers(workerScript);
  }

  private initWorkers(workerScript: string): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(new URL(workerScript, import.meta.url), { type: 'module' });
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn('Failed to create worker:', error);
      }
    }
  }

  public async execute<T>(task: WorkerTask): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.pop()!;
      const { task, resolve, reject } = this.taskQueue.shift()!;

      const timeoutId = setTimeout(() => {
        reject(new Error('Worker task timeout'));
        this.availableWorkers.push(worker);
      }, 30000); // 30 second timeout

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id === task.id) {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', messageHandler);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
          
          this.availableWorkers.push(worker);
          this.processQueue();
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage(task);
    }
  }

  public terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }
}

// Singleton worker pool
let globalWorkerPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool | null {
  if (!globalWorkerPool && typeof Worker !== 'undefined') {
    try {
      globalWorkerPool = new WorkerPool('./globe-worker.ts');
    } catch (error) {
      console.warn('Workers not supported or failed to initialize:', error);
    }
  }
  return globalWorkerPool;
}

export function terminateWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.terminate();
    globalWorkerPool = null;
  }
}

// Helper functions for common tasks
export async function processGeoDataInWorker(data: any): Promise<any> {
  const pool = getWorkerPool();
  if (!pool) {
    // Fallback to main thread
    return processGeoDataSync(data);
  }

  return pool.execute({
    id: `geo_${Date.now()}_${Math.random()}`,
    type: 'processGeoData',
    payload: data,
  });
}

// Synchronous fallback
function processGeoDataSync(data: any): any {
  // Simple processing that can run on main thread
  if (!data || !data.features) return data;
  
  return {
    ...data,
    features: data.features.filter((f: any) => 
      f.geometry && f.geometry.coordinates
    ),
  };
}

export default WorkerPool;
