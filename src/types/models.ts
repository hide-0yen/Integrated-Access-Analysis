/**
 * ドメインモデルの型定義
 */

/**
 * 分析タイプ
 */
export type AnalysisType =
  | "increase_factors" // アクセス増の要因分析
  | "decrease_factors" // アクセス減の要因分析
  | "overview" // 全体概要
  | "trend"; // トレンド分析

/**
 * 比較タイプ
 */
export type ComparisonType =
  | "previous_day" // 前日比
  | "previous_week" // 前週比
  | "previous_month" // 前月比
  | "custom"; // カスタム期間

/**
 * パース済みクエリ
 */
export interface ParsedQuery {
  targetDate: Date;
  comparisonDate: Date;
  analysisType: AnalysisType;
  comparisonType: ComparisonType;
}

/**
 * アプリケーション設定
 */
export interface AppConfig {
  ga4PropertyId: string;
  gscSiteUrl?: string;
  serviceAccountKeyPath?: string;
  defaultComparisonPeriod: ComparisonType;
  verbose: boolean;
  enableGSC: boolean;
  maxRetries?: number;
  requestTimeout?: number;
  dataLimit?: number;
  enablePerformanceMonitoring?: boolean;
  claude?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    timeout?: number;
  };
}

/**
 * GA4設定
 */
export interface GA4Config {
  propertyId: string;
  serviceAccountKeyPath?: string;
  credentials?: unknown;
}

/**
 * 認証設定
 */
export interface AuthConfig {
  serviceAccountKeyPath?: string;
  useApplicationDefaultCredentials?: boolean;
}

/**
 * GA4レポートリクエスト
 */
export interface GA4ReportRequest {
  dateRanges: DateRange[];
  dimensions: Dimension[];
  metrics: Metric[];
  limit?: number;
  offset?: number;
  orderBys?: OrderBy[];
}

/**
 * 日付範囲
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * ディメンション
 */
export interface Dimension {
  name: string;
}

/**
 * メトリクス
 */
export interface Metric {
  name: string;
}

/**
 * 並び順
 */
export interface OrderBy {
  metric?: { metricName: string };
  dimension?: { dimensionName: string };
  desc?: boolean;
}

/**
 * GA4レポートレスポンス
 */
export interface GA4ReportResponse {
  dimensionHeaders: DimensionHeader[];
  metricHeaders: MetricHeader[];
  rows: Row[];
  rowCount: number;
}

/**
 * ディメンションヘッダー
 */
export interface DimensionHeader {
  name: string;
}

/**
 * メトリクスヘッダー
 */
export interface MetricHeader {
  name: string;
  type: string;
}

/**
 * 行データ
 */
export interface Row {
  dimensionValues: DimensionValue[];
  metricValues: MetricValue[];
}

/**
 * ディメンション値
 */
export interface DimensionValue {
  value: string;
}

/**
 * メトリクス値
 */
export interface MetricValue {
  value: string;
}

/**
 * 比較用メトリクス値
 */
export interface ComparisonMetricValue {
  value: number;
  label: string;
}

/**
 * 比較結果
 */
export interface ComparisonResult {
  label: string;
  current: number;
  previous: number;
  absoluteChange: number;
  percentChange: number;
  isSignificant: boolean;
}

/**
 * GSC設定
 */
export interface GSCConfig {
  siteUrl: string;
  serviceAccountKeyPath?: string;
  credentials?: unknown;
}

/**
 * GSCリクエスト
 */
export interface GSCSearchAnalyticsRequest {
  startDate: string;
  endDate: string;
  dimensions?: Array<"query" | "page" | "country" | "device" | "date">;
  rowLimit?: number;
  startRow?: number;
}

/**
 * GSCレスポンス
 */
export interface GSCSearchAnalyticsResponse {
  rows?: GSCRow[];
  responseAggregationType?: string;
}

/**
 * GSC行データ
 */
export interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * GA4とGSCの相関分析メトリクス
 */
export interface CorrelationMetric {
  // GA4 オーガニック検索メトリクス
  organicSessions: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };

  // GSC総合メトリクス
  totalClicks: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };

  // キーワードとの相関
  keywordCorrelations: Array<{
    query: string;
    clicks: number;
    clicksChange: number;
    clicksChangePercent: number;
    position: number;
    positionChange: number;
    estimatedSessionContribution: number; // クリック数からセッション寄与度を推定
    contributionPercent: number; // 全体のオーガニック検索変化への寄与率
  }>;

  // 総合指標
  clickToSessionRate: number; // クリック→セッション変換率の推定値
  topContributors: Array<{
    query: string;
    contribution: number;
    contributionPercent: number;
  }>; // 増加要因TOP5
  topDetractors: Array<{
    query: string;
    contribution: number;
    contributionPercent: number;
  }>; // 減少要因TOP5
}

/**
 * 相関分析結果
 */
export interface CorrelationAnalysisResult {
  correlation: CorrelationMetric;
  insights: string[];
}
