/**
 * PerformanceMonitor Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PerformanceMonitor } from "@/infrastructure/performance-monitor";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(false);
  });

  describe("基本機能", () => {
    it("デフォルトで無効化されている", () => {
      expect(monitor.isEnabled()).toBe(false);
    });

    it("enable()で有効化できる", () => {
      monitor.enable();
      expect(monitor.isEnabled()).toBe(true);
    });

    it("disable()で無効化できる", () => {
      monitor.enable();
      monitor.disable();
      expect(monitor.isEnabled()).toBe(false);
    });

    it("コンストラクタで有効化状態を設定できる", () => {
      const enabledMonitor = new PerformanceMonitor(true);
      expect(enabledMonitor.isEnabled()).toBe(true);
    });
  });

  describe("recordDuration", () => {
    it("無効時はメトリクスを記録しない", () => {
      monitor.recordDuration("test-operation", 100);
      const stats = monitor.getStats("test-operation");
      expect(stats).toBeNull();
    });

    it("有効時はメトリクスを記録する", () => {
      monitor.enable();
      monitor.recordDuration("test-operation", 100);

      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBe(100);
    });

    it("同じ操作の複数回記録を集計する", () => {
      monitor.enable();
      monitor.recordDuration("test-operation", 100);
      monitor.recordDuration("test-operation", 200);
      monitor.recordDuration("test-operation", 300);

      const stats = monitor.getStats("test-operation");
      expect(stats?.count).toBe(3);
      expect(stats?.avg).toBe(200);
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(300);
    });

    it("メタデータを記録できる", () => {
      monitor.enable();
      monitor.recordDuration("test-operation", 100, { userId: "123" });

      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
    });
  });

  describe("recordMemoryUsage", () => {
    it("無効時はメモリ使用量を記録しない", () => {
      monitor.recordMemoryUsage("test-operation");
      const stats = monitor.getStats("test-operation");
      expect(stats).toBeNull();
    });

    it("有効時はメモリ使用量を記録する", () => {
      monitor.enable();
      monitor.recordMemoryUsage("test-operation");

      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });
  });

  describe("measure", () => {
    it("無効時でも関数を実行する", async () => {
      const result = await monitor.measure("test-operation", async () => {
        return "test-result";
      });

      expect(result).toBe("test-result");
      const stats = monitor.getStats("test-operation");
      expect(stats).toBeNull();
    });

    it("有効時は実行時間を計測する", async () => {
      monitor.enable();

      const result = await monitor.measure("test-operation", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "test-result";
      });

      expect(result).toBe("test-result");
      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBeGreaterThan(40); // 50ms前後
    });

    it("エラー時もメトリクスを記録する", async () => {
      monitor.enable();

      await expect(
        monitor.measure("test-operation", async () => {
          throw new Error("テストエラー");
        }),
      ).rejects.toThrow("テストエラー");

      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });

    it("メタデータを渡せる", async () => {
      monitor.enable();

      await monitor.measure("test-operation", async () => "result", {
        key: "value",
      });

      const stats = monitor.getStats("test-operation");
      expect(stats).not.toBeNull();
    });
  });

  describe("getStats", () => {
    beforeEach(() => {
      monitor.enable();
    });

    it("未記録の操作に対してnullを返す", () => {
      const stats = monitor.getStats("non-existent");
      expect(stats).toBeNull();
    });

    it("統計情報を正しく計算する", () => {
      monitor.recordDuration("test", 10);
      monitor.recordDuration("test", 20);
      monitor.recordDuration("test", 30);
      monitor.recordDuration("test", 40);
      monitor.recordDuration("test", 50);

      const stats = monitor.getStats("test");
      expect(stats?.count).toBe(5);
      expect(stats?.avg).toBe(30);
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(50);
      expect(stats?.p50).toBe(30);
      expect(stats?.totalDuration).toBe(150);
    });

    it("パーセンタイルを正しく計算する", () => {
      // 1, 2, 3, ..., 100
      for (let i = 1; i <= 100; i++) {
        monitor.recordDuration("test", i);
      }

      const stats = monitor.getStats("test");
      expect(stats?.p50).toBeCloseTo(50.5, 0);
      expect(stats?.p95).toBeCloseTo(95.05, 0);
      expect(stats?.p99).toBeCloseTo(99.01, 0);
    });
  });

  describe("getAllStats", () => {
    beforeEach(() => {
      monitor.enable();
    });

    it("すべての操作の統計を返す", () => {
      monitor.recordDuration("operation1", 100);
      monitor.recordDuration("operation2", 200);
      monitor.recordDuration("operation3", 300);

      const allStats = monitor.getAllStats();
      expect(allStats).toHaveLength(3);
    });

    it("総実行時間の降順にソートされる", () => {
      monitor.recordDuration("slow", 300);
      monitor.recordDuration("medium", 200);
      monitor.recordDuration("fast", 100);

      const allStats = monitor.getAllStats();
      expect(allStats[0]?.operation).toBe("slow");
      expect(allStats[1]?.operation).toBe("medium");
      expect(allStats[2]?.operation).toBe("fast");
    });

    it("メトリクスがない場合は空配列を返す", () => {
      const allStats = monitor.getAllStats();
      expect(allStats).toHaveLength(0);
    });
  });

  describe("generateReport", () => {
    beforeEach(() => {
      monitor.enable();
    });

    it("レポートを生成する", () => {
      monitor.recordDuration("operation1", 100);
      monitor.recordDuration("operation2", 200);

      const report = monitor.generateReport();

      expect(report.recordingStartTime).toBeInstanceOf(Date);
      expect(report.recordingEndTime).toBeInstanceOf(Date);
      expect(report.totalDuration).toBeGreaterThanOrEqual(0);
      expect(report.operations).toHaveLength(2);
      expect(report.summary.totalOperations).toBe(2);
      expect(report.summary.slowestOperation).toBe("operation2");
      expect(report.summary.fastestOperation).toBe("operation1");
    });

    it("メモリ使用量の平均を計算する", () => {
      monitor.recordMemoryUsage("operation1");
      monitor.recordMemoryUsage("operation2");

      const report = monitor.generateReport();

      expect(report.summary.avgMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe("clear", () => {
    beforeEach(() => {
      monitor.enable();
    });

    it("すべてのメトリクスをクリアする", () => {
      monitor.recordDuration("test", 100);
      expect(monitor.getStats("test")).not.toBeNull();

      monitor.clear();
      expect(monitor.getStats("test")).toBeNull();
    });

    it("記録開始時刻をリセットする", () => {
      const beforeClear = monitor.generateReport();
      const startTimeBefore = beforeClear.recordingStartTime;

      // 少し待つ
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      monitor.clear();
      const afterClear = monitor.generateReport();
      const startTimeAfter = afterClear.recordingStartTime;

      expect(startTimeAfter.getTime()).toBeGreaterThanOrEqual(
        startTimeBefore.getTime(),
      );

      vi.useRealTimers();
    });
  });

  describe("エッジケース", () => {
    beforeEach(() => {
      monitor.enable();
    });

    it("0msの実行時間を記録できる", () => {
      monitor.recordDuration("instant", 0);

      const stats = monitor.getStats("instant");
      expect(stats?.avg).toBe(0);
      expect(stats?.min).toBe(0);
      expect(stats?.max).toBe(0);
    });

    it("非常に大きな値を記録できる", () => {
      monitor.recordDuration("slow", 999999);

      const stats = monitor.getStats("slow");
      expect(stats?.avg).toBe(999999);
    });

    it("小数点を含む値を記録できる", () => {
      monitor.recordDuration("precise", 123.456);

      const stats = monitor.getStats("precise");
      expect(stats?.avg).toBeCloseTo(123.456, 2);
    });

    it("単一のデータポイントでパーセンタイルを計算できる", () => {
      monitor.recordDuration("single", 100);

      const stats = monitor.getStats("single");
      expect(stats?.p50).toBe(100);
      expect(stats?.p95).toBe(100);
      expect(stats?.p99).toBe(100);
    });
  });
});
