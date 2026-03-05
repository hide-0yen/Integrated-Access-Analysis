/**
 * GA4 Analyzer - Main Export
 * GA4 + Google Search Console integrated access analysis CLI tool
 */

// Domain Layer
export { QueryParser } from "./domain/query-parser";
export { ComparisonLogic } from "./domain/comparison-logic";

// Application Layer
export { AnalysisEngine } from "./application/analysis-engine";
export { InsightGenerator } from "./application/insight-generator";
export { QueryOrchestrator } from "./application/query-orchestrator";

// Infrastructure Layer
export { ConfigurationLoader } from "./infrastructure/config-loader";
export { AuthenticationManager } from "./infrastructure/auth-manager";
export { GA4ApiClient } from "./infrastructure/ga4-client";
export { GSCApiClient } from "./infrastructure/gsc-client";
export { ErrorHandler } from "./infrastructure/error-handler";
export {
  Logger,
  LogLevel,
  initializeLogger,
  getLogger,
} from "./infrastructure/logger";
export {
  PerformanceMonitor,
  initializePerformanceMonitor,
  getPerformanceMonitor,
} from "./infrastructure/performance-monitor";
export type {
  ErrorSeverity,
  ErrorContext,
} from "./infrastructure/error-handler";
export type { LogMeta } from "./infrastructure/logger";
export type {
  PerformanceMetric,
  PerformanceStats,
  PerformanceReport,
} from "./infrastructure/performance-monitor";

// Presentation Layer
export { OutputFormatter } from "./presentation/output-formatter";
export { CLIHandler } from "./presentation/cli-handler";

// Types
export type {
  AnalysisType,
  ComparisonType,
  ParsedQuery,
  AppConfig,
  GA4Config,
  GSCConfig,
  AuthConfig,
  GA4ReportRequest,
  GA4ReportResponse,
  GSCSearchAnalyticsRequest,
  GSCSearchAnalyticsResponse,
  ComparisonResult,
} from "./types/models";
export type { IntegratedAnalysisResult } from "./application/insight-generator";
export type {
  SourceMetric,
  SourceAnalysisResult,
  PageMetric,
  PageAnalysisResult,
  DeviceLocationMetric,
  DeviceLocationAnalysisResult,
  EventMetric,
  EventAnalysisResult,
  SearchKeywordMetric,
  SearchKeywordAnalysisResult,
} from "./application/analysis-engine";

// Errors
export {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "./types/errors";
