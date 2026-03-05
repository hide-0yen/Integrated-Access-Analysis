import { z } from "zod";

/**
 * LLM解析結果の生データスキーマ
 */
export const RawParsedQuerySchema = z.object({
  timeframe: z.object({
    type: z.enum(["relative_range", "absolute_range", "relative_point"]),
    expression: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    relativeValue: z.number().optional(),
    relativeUnit: z.enum(["day", "week", "month", "year"]).optional(),
  }),
  filters: z.array(
    z.object({
      dimension: z.string(),
      operator: z.enum(["equals", "contains", "startsWith", "regex"]),
      value: z.string(),
    }),
  ),
  metrics: z.array(z.string()),
  detection: z.object({
    type: z.enum(["growth", "decline", "anomaly", "threshold", "none"]),
    basis: z
      .enum(["day_over_day", "period_average", "statistical", "unspecified"])
      .optional(),
    threshold: z.number().optional(),
  }),
  outputFormat: z.enum(["date_list", "summary", "detailed_analysis"]),
});

export type RawParsedQuery = z.infer<typeof RawParsedQuerySchema>;

/**
 * 解決済みのTimeframe（絶対日付）
 */
export type TimeframeResolved =
  | {
      type: "absolute_range";
      startDate: string;
      endDate: string;
      expression: string;
    }
  | {
      type: "relative_range";
      startDate: string;
      endDate: string;
      expression: string;
    }
  | {
      type: "relative_point";
      targetDate: string;
      expression: string;
    };

/**
 * フィルター条件
 */
export interface FilterCondition {
  dimension: string;
  operator: "equals" | "contains" | "startsWith" | "regex";
  value: string;
}

/**
 * 検出条件
 */
export interface DetectionConfig {
  type: "growth" | "decline" | "anomaly" | "threshold" | "none";
  basis?: "day_over_day" | "period_average" | "statistical" | "unspecified";
  threshold?: number;
}

/**
 * 解析済み探索的クエリ
 */
export interface ParsedExploratoryQuery {
  analysisMode: "exploratory";
  timeframe: TimeframeResolved;
  filters: FilterCondition[];
  metrics: string[];
  detection: DetectionConfig;
  outputFormat: "date_list" | "summary" | "detailed_analysis";
  needsConfirmation: boolean;
  confirmationPrompts: string[];
}

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
