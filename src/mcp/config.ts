/**
 * MCP設定管理
 * 環境変数からGA4 Analyzer設定を読み込む
 */

import type { AppConfig } from "@/types/models";

/**
 * MCP環境変数からAppConfigを生成
 */
export function loadConfigFromEnv(): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

  // GA4 Property ID
  if (process.env.GA4_PROPERTY_ID) {
    config.ga4PropertyId = process.env.GA4_PROPERTY_ID;
  }

  // Service Account Key
  if (process.env.GA4_SERVICE_ACCOUNT_KEY) {
    config.serviceAccountKeyPath = process.env.GA4_SERVICE_ACCOUNT_KEY;
  }

  // Default Comparison Period
  if (process.env.GA4_DEFAULT_COMPARISON_PERIOD) {
    config.defaultComparisonPeriod = process.env
      .GA4_DEFAULT_COMPARISON_PERIOD as AppConfig["defaultComparisonPeriod"];
  }

  // GSC Settings
  if (process.env.GA4_ENABLE_GSC) {
    config.enableGSC = process.env.GA4_ENABLE_GSC === "true";
  }

  if (process.env.GA4_GSC_SITE_URL) {
    config.gscSiteUrl = process.env.GA4_GSC_SITE_URL;
  }

  // Performance Settings
  if (process.env.GA4_MAX_RETRIES) {
    config.maxRetries = Number.parseInt(process.env.GA4_MAX_RETRIES, 10);
  }

  if (process.env.GA4_REQUEST_TIMEOUT) {
    config.requestTimeout = Number.parseInt(
      process.env.GA4_REQUEST_TIMEOUT,
      10,
    );
  }

  if (process.env.GA4_DATA_LIMIT) {
    config.dataLimit = Number.parseInt(process.env.GA4_DATA_LIMIT, 10);
  }

  // Performance Monitoring
  if (process.env.GA4_ENABLE_PERFORMANCE_MONITORING) {
    config.enablePerformanceMonitoring =
      process.env.GA4_ENABLE_PERFORMANCE_MONITORING === "true";
  }

  return config;
}

/**
 * MCP設定情報
 */
export const MCP_SERVER_INFO = {
  name: "ga4-analyzer",
  version: "0.1.0",
  description:
    "GA4とGSCのデータを統合分析し、自然言語でインサイトを提供するMCPサーバー",
} as const;
