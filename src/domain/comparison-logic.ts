/**
 * ComparisonLogic
 * メトリクスの比較計算を行う
 */

import { ComparisonMetricValue, ComparisonResult } from "@/types/models";

/**
 * ComparisonLogicクラス
 */
export class ComparisonLogic {
  /**
   * 2つのメトリクス値を比較する
   */
  compare(
    current: ComparisonMetricValue,
    previous: ComparisonMetricValue,
  ): ComparisonResult {
    const absoluteChange = current.value - previous.value;
    const percentChange =
      previous.value === 0
        ? current.value > 0
          ? Infinity
          : 0
        : (absoluteChange / previous.value) * 100;

    // 10%以上の変化を有意とする
    const isSignificant = Math.abs(percentChange) >= 10;

    return {
      label: current.label,
      current: current.value,
      previous: previous.value,
      absoluteChange,
      percentChange,
      isSignificant,
    };
  }

  /**
   * 比較結果を変化率の大きい順にソートする
   */
  rankByChange(comparisons: ComparisonResult[]): ComparisonResult[] {
    return [...comparisons].sort(
      (a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange),
    );
  }

  /**
   * 有意な変化を持つ結果のみを抽出する
   */
  identifySignificantChanges(
    comparisons: ComparisonResult[],
    threshold = 10,
  ): ComparisonResult[] {
    return comparisons.filter(
      (result) => Math.abs(result.percentChange) >= threshold,
    );
  }

  /**
   * 増加している結果のみを抽出する
   */
  filterIncreases(comparisons: ComparisonResult[]): ComparisonResult[] {
    return comparisons.filter((result) => result.absoluteChange > 0);
  }

  /**
   * 減少している結果のみを抽出する
   */
  filterDecreases(comparisons: ComparisonResult[]): ComparisonResult[] {
    return comparisons.filter((result) => result.absoluteChange < 0);
  }

  /**
   * 上位N件の結果を取得する
   */
  topN(comparisons: ComparisonResult[], n: number): ComparisonResult[] {
    return this.rankByChange(comparisons).slice(0, n);
  }
}
