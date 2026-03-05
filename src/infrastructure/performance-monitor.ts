/**
 * PerformanceMonitor
 * パフォーマンスメトリクスの収集と分析
 */

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * 統計情報
 */
export interface PerformanceStats {
  operation: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  totalDuration: number;
}

/**
 * パフォーマンスレポート
 */
export interface PerformanceReport {
  recordingStartTime: Date;
  recordingEndTime: Date;
  totalDuration: number;
  operations: PerformanceStats[];
  summary: {
    totalOperations: number;
    slowestOperation: string;
    fastestOperation: string;
    avgMemoryUsage?: number;
  };
}

/**
 * PerformanceMonitorクラス
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]>;
  private enabled: boolean;
  private recordingStartTime: Date;

  constructor(enabled = false) {
    this.metrics = new Map();
    this.enabled = enabled;
    this.recordingStartTime = new Date();
  }

  /**
   * モニタリングを有効化
   */
  enable(): void {
    this.enabled = true;
    this.recordingStartTime = new Date();
  }

  /**
   * モニタリングを無効化
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 有効状態を取得
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 処理時間を記録
   */
  recordDuration(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.enabled) {
      return;
    }

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)?.push(metric);
  }

  /**
   * メモリ使用量を記録
   */
  recordMemoryUsage(
    operation: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.enabled) {
      return;
    }

    const memUsage = process.memoryUsage();
    const metric: PerformanceMetric = {
      operation,
      duration: 0,
      timestamp: new Date(),
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      metadata,
    };

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)?.push(metric);
  }

  /**
   * 操作を計測して実行
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: new Date(),
        memoryUsage: {
          heapUsed: process.memoryUsage().heapUsed - startMemory.heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external - startMemory.external,
          rss: process.memoryUsage().rss - startMemory.rss,
        },
        metadata,
      };

      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      this.metrics.get(operation)?.push(metric);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // エラー時もメトリクスを記録
      this.recordDuration(operation, duration, {
        ...metadata,
        error: true,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(operation);
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avg = totalDuration / count;
    const min = durations[0] ?? 0;
    const max = durations[count - 1] ?? 0;
    const p50 = this.percentile(durations, 50);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    return {
      operation,
      count,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
      totalDuration,
    };
  }

  /**
   * すべての統計情報を取得
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    for (const operation of this.metrics.keys()) {
      const stat = this.getStats(operation);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): PerformanceReport {
    const recordingEndTime = new Date();
    const totalDuration =
      recordingEndTime.getTime() - this.recordingStartTime.getTime();

    const operations = this.getAllStats();

    // 平均メモリ使用量を計算
    let totalMemoryUsage = 0;
    let memoryCount = 0;
    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.memoryUsage) {
          totalMemoryUsage += metric.memoryUsage.heapUsed;
          memoryCount++;
        }
      }
    }
    const avgMemoryUsage =
      memoryCount > 0 ? totalMemoryUsage / memoryCount : undefined;

    // 最も遅い・速い操作を特定
    let slowestOperation = "";
    let fastestOperation = "";
    let maxDuration = 0;
    let minDuration = Number.POSITIVE_INFINITY;

    for (const stat of operations) {
      if (stat.avg > maxDuration) {
        maxDuration = stat.avg;
        slowestOperation = stat.operation;
      }
      if (stat.avg < minDuration) {
        minDuration = stat.avg;
        fastestOperation = stat.operation;
      }
    }

    return {
      recordingStartTime: this.recordingStartTime,
      recordingEndTime,
      totalDuration,
      operations,
      summary: {
        totalOperations: operations.reduce((sum, op) => sum + op.count, 0),
        slowestOperation,
        fastestOperation,
        avgMemoryUsage,
      },
    };
  }

  /**
   * レポートをコンソールに出力
   */
  printReport(): void {
    const report = this.generateReport();

    console.log("\n=== Performance Report ===");
    console.log(
      `Recording Period: ${report.recordingStartTime.toISOString()} - ${report.recordingEndTime.toISOString()}`,
    );
    console.log(`Total Duration: ${report.totalDuration.toFixed(0)}ms`);
    console.log(`Total Operations: ${String(report.summary.totalOperations)}`);

    if (report.summary.avgMemoryUsage !== undefined) {
      console.log(
        `Average Memory Usage: ${this.formatBytes(report.summary.avgMemoryUsage)}`,
      );
    }

    console.log("\nOperation Statistics:");
    console.log(
      "┌─────────────────────────────────┬───────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐",
    );
    console.log(
      "│ Operation                       │ Count │ Avg(ms) │ Min(ms) │ Max(ms) │ P50(ms) │ P95(ms) │ P99(ms) │",
    );
    console.log(
      "├─────────────────────────────────┼───────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤",
    );

    for (const stat of report.operations) {
      const operation = stat.operation.padEnd(31).substring(0, 31);
      const count = String(stat.count).padStart(5);
      const avg = stat.avg.toFixed(1).padStart(7);
      const min = stat.min.toFixed(1).padStart(7);
      const max = stat.max.toFixed(1).padStart(7);
      const p50 = stat.p50.toFixed(1).padStart(7);
      const p95 = stat.p95.toFixed(1).padStart(7);
      const p99 = stat.p99.toFixed(1).padStart(7);

      console.log(
        `│ ${operation} │ ${count} │ ${avg} │ ${min} │ ${max} │ ${p50} │ ${p95} │ ${p99} │`,
      );
    }

    console.log(
      "└─────────────────────────────────┴───────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘",
    );

    if (report.summary.slowestOperation) {
      console.log(`\nSlowest Operation: ${report.summary.slowestOperation}`);
    }
    if (report.summary.fastestOperation) {
      console.log(`Fastest Operation: ${report.summary.fastestOperation}`);
    }

    console.log("========================\n");
  }

  /**
   * メトリクスをクリア
   */
  clear(): void {
    this.metrics.clear();
    this.recordingStartTime = new Date();
  }

  /**
   * パーセンタイル計算
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    const lowerValue = sortedValues[lower] ?? 0;
    const upperValue = sortedValues[upper] ?? 0;

    return lowerValue + weight * (upperValue - lowerValue);
  }

  /**
   * バイト数をフォーマット
   */
  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * グローバルパフォーマンスモニターインスタンス
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * グローバルモニターを初期化
 */
export function initializePerformanceMonitor(
  enabled = false,
): PerformanceMonitor {
  globalMonitor = new PerformanceMonitor(enabled);
  return globalMonitor;
}

/**
 * グローバルモニターを取得
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(false);
  }
  return globalMonitor;
}
