/**
 * TimeframeAnalysis
 * 指定期間のGA4データを取得し、時系列データと統計情報を算出
 */

import type { GA4ApiClient } from "@/infrastructure/ga4-client";
import type {
  ParsedExploratoryQuery,
  FilterCondition,
} from "@/domain/types/exploratory-query";
import type { GA4ReportRequest } from "@/types/models";

/**
 * 時系列データポイント
 */
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

/**
 * 統計情報
 */
export interface Statistics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  count: number;
}

/**
 * Timeframe分析結果
 */
export interface TimeframeAnalysisResult {
  timeSeries: TimeSeriesDataPoint[];
  statistics: Statistics;
  totalValue: number;
}

/**
 * TimeframeAnalysisクラス
 */
export class TimeframeAnalysis {
  constructor(
    private ga4Client: GA4ApiClient,
    private propertyId: string,
  ) {}

  /**
   * 探索的クエリに基づいてデータを取得・分析
   */
  async analyze(
    query: ParsedExploratoryQuery,
  ): Promise<TimeframeAnalysisResult> {
    // Timeframeから日付範囲を取得
    const { startDate, endDate } = this.extractDateRange(query);

    // GA4リクエストを構築
    const request = this.buildGA4Request(
      startDate,
      endDate,
      query.metrics[0],
      query.filters,
    );

    // GA4データ取得
    const response = await this.ga4Client.runReport(request);

    // 時系列データに変換
    const timeSeries = this.convertToTimeSeries(
      response.rows,
      query.metrics[0],
    );

    // 統計情報を算出
    const statistics = this.calculateStatistics(timeSeries);

    // 合計値を算出
    const totalValue = timeSeries.reduce((sum, point) => sum + point.value, 0);

    return {
      timeSeries,
      statistics,
      totalValue,
    };
  }

  /**
   * クエリから日付範囲を抽出
   */
  private extractDateRange(query: ParsedExploratoryQuery): {
    startDate: string;
    endDate: string;
  } {
    const { timeframe } = query;

    if (timeframe.type === "absolute_range") {
      return {
        startDate: timeframe.startDate,
        endDate: timeframe.endDate,
      };
    }

    if (timeframe.type === "relative_range") {
      return {
        startDate: timeframe.startDate,
        endDate: timeframe.endDate,
      };
    }

    // relative_point の場合、1日だけのデータ
    return {
      startDate: timeframe.targetDate,
      endDate: timeframe.targetDate,
    };
  }

  /**
   * GA4リクエストを構築
   */
  private buildGA4Request(
    startDate: string,
    endDate: string,
    metric: string,
    _filters: FilterCondition[],
  ): GA4ReportRequest {
    const request: GA4ReportRequest = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: metric }],
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
    };

    // フィルターを適用（必要に応じてdimensionFilterやmetricFilterを追加）
    // 簡略化のため、ここでは基本的な構造のみ
    // 実際の実装では、filtersをGA4のFilterExpressionに変換する必要があります

    return request;
  }

  /**
   * GA4レスポンスを時系列データに変換
   */
  private convertToTimeSeries(
    rows: Array<{
      dimensionValues: Array<{ value: string }>;
      metricValues: Array<{ value: string }>;
    }>,
    _metric: string,
  ): TimeSeriesDataPoint[] {
    return rows.map((row) => ({
      date: this.formatDateFromGA4(row.dimensionValues[0].value),
      value: Number.parseFloat(row.metricValues[0].value),
    }));
  }

  /**
   * GA4の日付形式(YYYYMMDD)をYYYY-MM-DD形式に変換
   */
  private formatDateFromGA4(ga4Date: string): string {
    const year = ga4Date.slice(0, 4);
    const month = ga4Date.slice(4, 6);
    const day = ga4Date.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  /**
   * 統計情報を算出
   */
  private calculateStatistics(data: TimeSeriesDataPoint[]): Statistics {
    if (data.length === 0) {
      return {
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        median: 0,
        count: 0,
      };
    }

    const values = data.map((d) => d.value);
    const count = values.length;

    // 平均
    const mean = values.reduce((sum, val) => sum + val, 0) / count;

    // 標準偏差
    const variance =
      values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);

    // 最小値・最大値
    const min = Math.min(...values);
    const max = Math.max(...values);

    // 中央値
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];

    return {
      mean,
      stdDev,
      min,
      max,
      median,
      count,
    };
  }
}
