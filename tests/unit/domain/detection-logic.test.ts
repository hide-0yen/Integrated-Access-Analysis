import { describe, it, expect, beforeEach } from "vitest";
import { DetectionLogic } from "@/domain/detection-logic";
import type {
  DetectionConfig,
  TimeSeriesDataPoint,
  Statistics,
} from "@/domain/types/exploratory-query";

describe("DetectionLogic", () => {
  let logic: DetectionLogic;
  let sampleTimeSeries: TimeSeriesDataPoint[];
  let sampleStatistics: Statistics;

  beforeEach(() => {
    logic = new DetectionLogic();

    sampleTimeSeries = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-01-02", value: 120 },
      { date: "2024-01-03", value: 80 },
      { date: "2024-01-04", value: 150 },
      { date: "2024-01-05", value: 110 },
    ];

    sampleStatistics = {
      mean: 112,
      stdDev: 24,
      min: 80,
      max: 150,
      median: 110,
      count: 5,
    };
  });

  describe("検出なし (none)", () => {
    it("全データを検出済みとして返す", () => {
      const config: DetectionConfig = { type: "none" };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.isDetected)).toBe(true);
      expect(results.every((r) => r.reason === "全データ取得")).toBe(true);
    });
  });

  describe("前日比検出 (day_over_day)", () => {
    it("増加を正しく検出できる", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "day_over_day",
        threshold: 10,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // 最初の日は比較対象なし
      expect(results[0].isDetected).toBe(false);
      expect(results[0].reason).toBe("比較対象なし");

      // 2日目: 100→120 (+20%)
      expect(results[1].isDetected).toBe(true);
      expect(results[1].changeRate).toBeCloseTo(20, 1);

      // 3日目: 120→80 (-33.3%)
      expect(results[2].isDetected).toBe(false);
    });

    it("減少を正しく検出できる", () => {
      const config: DetectionConfig = {
        type: "decline",
        basis: "day_over_day",
        threshold: 10,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // 3日目: 120→80 (-33.3%)
      expect(results[2].isDetected).toBe(true);
      expect(results[2].changeRate).toBeLessThan(-10);
    });

    it("閾値を超える変化を検出できる", () => {
      const config: DetectionConfig = {
        type: "threshold",
        basis: "day_over_day",
        threshold: 30,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // 3日目: 120→80 (-33.3%)
      expect(results[2].isDetected).toBe(true);

      // 4日目: 80→150 (+87.5%)
      expect(results[3].isDetected).toBe(true);
    });
  });

  describe("期間平均比検出 (period_average)", () => {
    it("平均より高い値を増加として検出できる", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "period_average",
        threshold: 10,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // 4日目: value=150, mean=112, changeRate≈33.9%
      expect(results[3].isDetected).toBe(true);
      expect(results[3].changeRate).toBeGreaterThan(10);
      expect(results[3].deviationFromMean).toBeCloseTo(38, 0);
    });

    it("平均より低い値を減少として検出できる", () => {
      const config: DetectionConfig = {
        type: "decline",
        basis: "period_average",
        threshold: 10,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // 3日目: value=80, mean=112, changeRate≈-28.6%
      expect(results[2].isDetected).toBe(true);
      expect(results[2].changeRate).toBeLessThan(-10);
    });

    it("閾値内の値は検出しない", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "period_average",
        threshold: 50,
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);

      // mean=112, threshold=50%なので、約168以上が検出される
      // 最大値150は検出されない
      expect(results.filter((r) => r.isDetected)).toHaveLength(0);
    });
  });

  describe("統計的検出 (statistical)", () => {
    it("異常値(±2σ外)を検出できる", () => {
      const timeSeries: TimeSeriesDataPoint[] = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 110 },
        { date: "2024-01-03", value: 105 },
        { date: "2024-01-04", value: 200 }, // 異常値
        { date: "2024-01-05", value: 108 },
      ];

      const stats: Statistics = {
        mean: 100,
        stdDev: 10,
        min: 100,
        max: 200,
        median: 105,
        count: 5,
      };

      const config: DetectionConfig = {
        type: "anomaly",
        basis: "statistical",
      };

      const results = logic.detect(timeSeries, stats, config);

      // mean+2σ = 100+20 = 120を超える値が異常
      expect(results[3].isDetected).toBe(true);
      expect(results[3].reason).toContain("統計的異常");
    });

    it("統計的増加(+2σ以上)を検出できる", () => {
      const timeSeries: TimeSeriesDataPoint[] = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 110 },
        { date: "2024-01-03", value: 150 }, // 統計的増加
      ];

      const stats: Statistics = {
        mean: 100,
        stdDev: 20,
        min: 100,
        max: 150,
        median: 110,
        count: 3,
      };

      const config: DetectionConfig = {
        type: "growth",
        basis: "statistical",
      };

      const results = logic.detect(timeSeries, stats, config);

      // mean+2σ = 100+40 = 140を超える値が増加
      expect(results[2].isDetected).toBe(true);
      expect(results[2].reason).toContain("統計的増加");
    });

    it("統計的減少(-2σ以下)を検出できる", () => {
      const timeSeries: TimeSeriesDataPoint[] = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-02", value: 95 },
        { date: "2024-01-03", value: 50 }, // 統計的減少
      ];

      const stats: Statistics = {
        mean: 100,
        stdDev: 20,
        min: 50,
        max: 100,
        median: 95,
        count: 3,
      };

      const config: DetectionConfig = {
        type: "decline",
        basis: "statistical",
      };

      const results = logic.detect(timeSeries, stats, config);

      // mean-2σ = 100-40 = 60を下回る値が減少
      expect(results[2].isDetected).toBe(true);
      expect(results[2].reason).toContain("統計的減少");
    });
  });

  describe("ランキング機能", () => {
    it("変化率でランキングできる(降順)", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "day_over_day",
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);
      const ranked = logic.rankByChangeRate(results, true);

      // 変化率が大きい順にソート
      expect(ranked.length).toBeGreaterThan(0);
      for (let i = 0; i < ranked.length - 1; i++) {
        const current = ranked[i].changeRate ?? 0;
        const next = ranked[i + 1].changeRate ?? 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it("変化率でランキングできる(昇順)", () => {
      const config: DetectionConfig = {
        type: "decline",
        basis: "day_over_day",
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);
      const ranked = logic.rankByChangeRate(results, false);

      // 変化率が小さい順にソート
      for (let i = 0; i < ranked.length - 1; i++) {
        const current = ranked[i].changeRate ?? 0;
        const next = ranked[i + 1].changeRate ?? 0;
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it("値の大きさでランキングできる(降順)", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "period_average",
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);
      const ranked = logic.rankByValue(results, true);

      // 値が大きい順にソート
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].value).toBeGreaterThanOrEqual(ranked[i + 1].value);
      }
    });

    it("値の大きさでランキングできる(昇順)", () => {
      const config: DetectionConfig = {
        type: "decline",
        basis: "period_average",
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);
      const ranked = logic.rankByValue(results, false);

      // 値が小さい順にソート
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].value).toBeLessThanOrEqual(ranked[i + 1].value);
      }
    });

    it("Top N件を取得できる", () => {
      const config: DetectionConfig = {
        type: "growth",
        basis: "period_average",
      };

      const results = logic.detect(sampleTimeSeries, sampleStatistics, config);
      const ranked = logic.rankByChangeRate(results, true);
      const top3 = logic.topN(ranked, 3);

      expect(top3).toHaveLength(Math.min(3, ranked.length));
    });
  });

  describe("エッジケース", () => {
    it("データが1件の場合も正常に処理できる", () => {
      const singleData: TimeSeriesDataPoint[] = [
        { date: "2024-01-01", value: 100 },
      ];

      const stats: Statistics = {
        mean: 100,
        stdDev: 0,
        min: 100,
        max: 100,
        median: 100,
        count: 1,
      };

      const config: DetectionConfig = {
        type: "growth",
        basis: "day_over_day",
      };

      const results = logic.detect(singleData, stats, config);

      expect(results).toHaveLength(1);
      expect(results[0].isDetected).toBe(false); // 比較対象なし
    });

    it("前日の値が0の場合も正常に処理できる", () => {
      const timeSeries: TimeSeriesDataPoint[] = [
        { date: "2024-01-01", value: 0 },
        { date: "2024-01-02", value: 100 },
      ];

      const stats: Statistics = {
        mean: 50,
        stdDev: 50,
        min: 0,
        max: 100,
        median: 50,
        count: 2,
      };

      const config: DetectionConfig = {
        type: "growth",
        basis: "day_over_day",
      };

      const results = logic.detect(timeSeries, stats, config);

      // 0→100の変化率は100%
      expect(results[1].isDetected).toBe(true);
      expect(results[1].changeRate).toBe(100);
    });
  });
});
