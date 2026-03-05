/**
 * DetectionLogic
 * データの増加・減少・異常値を検出
 */

import type {
  DetectionConfig,
  TimeSeriesDataPoint,
  Statistics,
} from "@/domain/types/exploratory-query";

/**
 * 検出結果
 */
export interface DetectionResult {
  date: string;
  value: number;
  changeRate?: number;
  deviationFromMean?: number;
  isDetected: boolean;
  reason?: string;
}

/**
 * DetectionLogicクラス
 */
export class DetectionLogic {
  /**
   * 検出を実行
   */
  detect(
    timeSeries: TimeSeriesDataPoint[],
    statistics: Statistics,
    config: DetectionConfig,
  ): DetectionResult[] {
    if (config.type === "none") {
      return timeSeries.map((point) => ({
        date: point.date,
        value: point.value,
        isDetected: true,
        reason: "全データ取得",
      }));
    }

    switch (config.basis) {
      case "day_over_day":
        return this.detectDayOverDay(timeSeries, config);
      case "period_average":
        return this.detectPeriodAverage(timeSeries, statistics, config);
      case "statistical":
        return this.detectStatistical(timeSeries, statistics, config);
      default:
        return this.detectPeriodAverage(timeSeries, statistics, config);
    }
  }

  /**
   * 前日比での検出
   */
  private detectDayOverDay(
    timeSeries: TimeSeriesDataPoint[],
    config: DetectionConfig,
  ): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (let i = 0; i < timeSeries.length; i++) {
      const current = timeSeries[i];
      const previous = i > 0 ? timeSeries[i - 1] : null;

      if (!previous) {
        // 最初の日は比較対象がないので検出しない
        results.push({
          date: current.date,
          value: current.value,
          isDetected: false,
          reason: "比較対象なし",
        });
        continue;
      }

      const changeRate = this.calculateChangeRate(
        previous.value,
        current.value,
      );
      const isDetected = this.evaluateDetection(
        changeRate,
        config.type,
        config.threshold,
      );

      results.push({
        date: current.date,
        value: current.value,
        changeRate,
        isDetected,
        reason: isDetected
          ? `前日比 ${changeRate > 0 ? "+" : ""}${changeRate.toFixed(1)}%`
          : undefined,
      });
    }

    return results;
  }

  /**
   * 期間平均との比較での検出
   */
  private detectPeriodAverage(
    timeSeries: TimeSeriesDataPoint[],
    statistics: Statistics,
    config: DetectionConfig,
  ): DetectionResult[] {
    const { mean } = statistics;

    return timeSeries.map((point) => {
      const changeRate = this.calculateChangeRate(mean, point.value);
      const isDetected = this.evaluateDetection(
        changeRate,
        config.type,
        config.threshold,
      );

      return {
        date: point.date,
        value: point.value,
        changeRate,
        deviationFromMean: point.value - mean,
        isDetected,
        reason: isDetected
          ? `平均比 ${changeRate > 0 ? "+" : ""}${changeRate.toFixed(1)}%`
          : undefined,
      };
    });
  }

  /**
   * 統計的手法（2σ）での異常値検出
   */
  private detectStatistical(
    timeSeries: TimeSeriesDataPoint[],
    statistics: Statistics,
    config: DetectionConfig,
  ): DetectionResult[] {
    const { mean, stdDev } = statistics;
    const threshold2Sigma = mean + 2 * stdDev;
    const thresholdNeg2Sigma = mean - 2 * stdDev;

    return timeSeries.map((point) => {
      let isDetected = false;
      let reason: string | undefined;

      if (config.type === "anomaly") {
        // 異常値検出: ±2σ外
        isDetected =
          point.value > threshold2Sigma || point.value < thresholdNeg2Sigma;
        if (isDetected) {
          const sigmaValue = (point.value - mean) / stdDev;
          reason = `統計的異常 (${sigmaValue > 0 ? "+" : ""}${sigmaValue.toFixed(2)}σ)`;
        }
      } else if (config.type === "growth") {
        // 増加検出: +2σ以上
        isDetected = point.value > threshold2Sigma;
        if (isDetected) {
          const sigmaValue = (point.value - mean) / stdDev;
          reason = `統計的増加 (+${sigmaValue.toFixed(2)}σ)`;
        }
      } else if (config.type === "decline") {
        // 減少検出: -2σ以下
        isDetected = point.value < thresholdNeg2Sigma;
        if (isDetected) {
          const sigmaValue = (point.value - mean) / stdDev;
          reason = `統計的減少 (${sigmaValue.toFixed(2)}σ)`;
        }
      }

      return {
        date: point.date,
        value: point.value,
        deviationFromMean: point.value - mean,
        isDetected,
        reason,
      };
    });
  }

  /**
   * 変化率を計算
   */
  private calculateChangeRate(baseValue: number, currentValue: number): number {
    if (baseValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return ((currentValue - baseValue) / baseValue) * 100;
  }

  /**
   * 検出条件を評価
   */
  private evaluateDetection(
    changeRate: number,
    detectionType: DetectionConfig["type"],
    threshold?: number,
  ): boolean {
    const effectiveThreshold = threshold ?? 0;

    switch (detectionType) {
      case "growth":
        return changeRate > effectiveThreshold;
      case "decline":
        return changeRate < -effectiveThreshold;
      case "threshold":
        return Math.abs(changeRate) > effectiveThreshold;
      case "anomaly":
        // 異常値検出は統計的手法で処理されるため、ここでは常にfalse
        return false;
      case "none":
        return true;
    }
  }

  /**
   * 検出結果を変化率でランキング
   */
  rankByChangeRate(
    results: DetectionResult[],
    descending: boolean = true,
  ): DetectionResult[] {
    return [...results]
      .filter((r) => r.isDetected)
      .sort((a, b) => {
        const aRate = a.changeRate ?? 0;
        const bRate = b.changeRate ?? 0;
        return descending ? bRate - aRate : aRate - bRate;
      });
  }

  /**
   * 検出結果を値の大きさでランキング
   */
  rankByValue(
    results: DetectionResult[],
    descending: boolean = true,
  ): DetectionResult[] {
    return [...results]
      .filter((r) => r.isDetected)
      .sort((a, b) => (descending ? b.value - a.value : a.value - b.value));
  }

  /**
   * Top N件を取得
   */
  topN(results: DetectionResult[], n: number): DetectionResult[] {
    return results.slice(0, n);
  }
}
