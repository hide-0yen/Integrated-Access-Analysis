# GA4 Analyzer API Documentation

This document provides comprehensive API documentation for programmatic use of GA4 Analyzer.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)
- [Advanced Topics](#advanced-topics)

## Installation

```bash
npm install ga4-analyzer
```

## Quick Start

```typescript
import { QueryOrchestrator } from "ga4-analyzer";

// Initialize the orchestrator
const orchestrator = new QueryOrchestrator();

// Execute a query
const result = await orchestrator.execute("昨日のアクセス増の要因");

console.log(result);
```

## Core Classes

### QueryOrchestrator

The main entry point for executing analysis queries.

```typescript
import { QueryOrchestrator, type IntegratedAnalysisResult } from "ga4-analyzer";

class QueryOrchestrator {
  constructor();

  /**
   * Execute a natural language query
   * @param rawQuery - Natural language query in Japanese
   * @param options - Optional execution options
   * @returns Analysis results with insights
   */
  async execute(
    rawQuery: string,
    options?: {
      verbose?: boolean;
      propertyId?: string;
      enableGSC?: boolean;
    }
  ): Promise<IntegratedAnalysisResult>;

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig>;

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }>;
}
```

**Example:**

```typescript
const orchestrator = new QueryOrchestrator();

// Basic usage
const result = await orchestrator.execute("3/3のアクセス増の要因");

// With options
const result = await orchestrator.execute("昨日のトラフィック", {
  verbose: true,
  propertyId: "123456789",
  enableGSC: true,
});

// Validate configuration
const validation = await orchestrator.validateConfig();
if (!validation.valid) {
  console.error("Configuration errors:", validation.errors);
}
```

### QueryParser

Parses natural language queries into structured data.

```typescript
import { QueryParser, type ParsedQuery } from "ga4-analyzer";

class QueryParser {
  constructor();

  /**
   * Parse a natural language query
   * @param rawQuery - Natural language query
   * @param options - Parse options
   * @returns Parsed query structure
   */
  parse(
    rawQuery: string,
    options?: {
      defaultComparisonType?: ComparisonType;
      referenceDate?: Date;
    }
  ): ParsedQuery;
}
```

**Example:**

```typescript
const parser = new QueryParser();

const parsed = parser.parse("昨日のアクセス増の要因");
// {
//   targetDate: Date(...),
//   comparisonDate: Date(...),
//   analysisType: "increase_factors",
//   comparisonType: "previous_day"
// }

// With custom reference date (useful for testing)
const parsed = parser.parse("昨日のアクセス", {
  referenceDate: new Date("2026-03-04"),
  defaultComparisonType: "previous_week",
});
```

### AnalysisEngine

Performs multi-axis data analysis.

```typescript
import { AnalysisEngine } from "ga4-analyzer";

class AnalysisEngine {
  constructor(
    ga4Client: GA4ApiClient,
    gscClient?: GSCApiClient
  );

  /**
   * Analyze traffic sources
   */
  async analyzeTrafficSources(
    targetDate: Date,
    comparisonDate: Date,
    propertyId: string
  ): Promise<SourceAnalysisResult>;

  /**
   * Analyze pages and content
   */
  async analyzePages(
    targetDate: Date,
    comparisonDate: Date,
    propertyId: string
  ): Promise<PageAnalysisResult>;

  /**
   * Analyze devices and locations
   */
  async analyzeDeviceLocations(
    targetDate: Date,
    comparisonDate: Date,
    propertyId: string
  ): Promise<DeviceLocationAnalysisResult>;

  /**
   * Analyze events
   */
  async analyzeEvents(
    targetDate: Date,
    comparisonDate: Date,
    propertyId: string
  ): Promise<EventAnalysisResult>;

  /**
   * Analyze search keywords (GSC)
   */
  async analyzeSearchKeywords(
    targetDate: Date,
    comparisonDate: Date,
    siteUrl: string
  ): Promise<SearchKeywordAnalysisResult>;

  /**
   * Run all analyses in parallel
   */
  async analyzeAll(
    targetDate: Date,
    comparisonDate: Date,
    propertyId: string,
    options?: { enableGSC?: boolean; siteUrl?: string }
  ): Promise<{
    sources?: SourceAnalysisResult;
    pages?: PageAnalysisResult;
    devices?: DeviceLocationAnalysisResult;
    events?: EventAnalysisResult;
    keywords?: SearchKeywordAnalysisResult;
    errors: Map<string, Error>;
  }>;
}
```

**Example:**

```typescript
import { AnalysisEngine, GA4ApiClient, GSCApiClient } from "ga4-analyzer";

const ga4Client = new GA4ApiClient();
const gscClient = new GSCApiClient();
const engine = new AnalysisEngine(ga4Client, gscClient);

// Analyze traffic sources only
const sources = await engine.analyzeTrafficSources(
  new Date("2026-03-03"),
  new Date("2026-03-02"),
  "123456789"
);

// Run all analyses in parallel
const results = await engine.analyzeAll(
  new Date("2026-03-03"),
  new Date("2026-03-02"),
  "123456789",
  { enableGSC: true, siteUrl: "https://example.com" }
);

console.log("Traffic sources:", results.sources);
console.log("Pages:", results.pages);
console.log("Devices:", results.devices);
console.log("Events:", results.events);
console.log("Keywords:", results.keywords);
console.log("Errors:", results.errors);
```

### ComparisonLogic

Provides comparison and filtering utilities.

```typescript
import { ComparisonLogic, type ComparisonResult } from "ga4-analyzer";

class ComparisonLogic {
  constructor();

  /**
   * Compare two metric values
   */
  compare(
    current: ComparisonMetricValue,
    previous: ComparisonMetricValue
  ): ComparisonResult;

  /**
   * Rank comparisons by change magnitude
   */
  rankByChange(comparisons: ComparisonResult[]): ComparisonResult[];

  /**
   * Filter significant changes
   */
  identifySignificantChanges(
    comparisons: ComparisonResult[],
    threshold?: number
  ): ComparisonResult[];

  /**
   * Filter increases only
   */
  filterIncreases(comparisons: ComparisonResult[]): ComparisonResult[];

  /**
   * Filter decreases only
   */
  filterDecreases(comparisons: ComparisonResult[]): ComparisonResult[];

  /**
   * Get top N results
   */
  topN(comparisons: ComparisonResult[], n: number): ComparisonResult[];
}
```

**Example:**

```typescript
import { ComparisonLogic } from "ga4-analyzer";

const logic = new ComparisonLogic();

const result = logic.compare(
  { label: "Organic Search", value: 1500 },
  { label: "Organic Search", value: 1000 }
);

console.log(result);
// {
//   label: "Organic Search",
//   current: 1500,
//   previous: 1000,
//   absoluteChange: 500,
//   percentChange: 50,
//   isSignificant: true
// }

// Filter and rank
const comparisons = [/* ... */];
const significant = logic.identifySignificantChanges(comparisons, 20);
const topIncreases = logic.topN(logic.filterIncreases(significant), 5);
```

### GA4ApiClient & GSCApiClient

API clients for Google Analytics 4 and Search Console.

```typescript
import { GA4ApiClient, GSCApiClient } from "ga4-analyzer";

class GA4ApiClient {
  constructor();

  async initialize(authClient: any, propertyId: string): Promise<void>;

  async runReport(request: GA4ReportRequest): Promise<GA4ReportResponse>;

  async runBatchReports(requests: GA4ReportRequest[]): Promise<GA4ReportResponse[]>;
}

class GSCApiClient {
  constructor();

  async initialize(auth: any): Promise<void>;

  async searchAnalytics(request: GSCSearchAnalyticsRequest): Promise<GSCSearchAnalyticsResponse>;
}
```

**Example:**

```typescript
import { GA4ApiClient, AuthenticationManager } from "ga4-analyzer";

const authManager = new AuthenticationManager();
const credentials = await authManager.loadCredentials();

const client = new GA4ApiClient();
await client.initialize(credentials, "123456789");

const response = await client.runReport({
  dateRanges: [{ startDate: "2026-03-01", endDate: "2026-03-03" }],
  dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
  metrics: [{ name: "sessions" }],
});
```

## Type Definitions

### ParsedQuery

```typescript
interface ParsedQuery {
  targetDate: Date;           // The date to analyze
  comparisonDate: Date;       // The date to compare against
  analysisType: AnalysisType; // Type of analysis
  comparisonType: ComparisonType; // Comparison period type
}

type AnalysisType = "increase_factors" | "decrease_factors" | "overview" | "trend";
type ComparisonType = "previous_day" | "previous_week" | "previous_month" | "custom";
```

### ComparisonResult

```typescript
interface ComparisonResult {
  label: string;            // Dimension label (e.g., "Organic Search")
  current: number;          // Current period value
  previous: number;         // Previous period value
  absoluteChange: number;   // Absolute difference
  percentChange: number;    // Percentage change
  isSignificant: boolean;   // Whether change is significant (>10%)
}
```

### Analysis Results

```typescript
interface SourceAnalysisResult {
  metrics: SourceMetric[];
  summary: {
    currentTotalSessions: number;
    previousTotalSessions: number;
    absoluteChange: number;
    percentChange: number;
  };
}

interface SourceMetric {
  source: string;
  medium: string;
  currentSessions: number;
  previousSessions: number;
  currentNewUsers: number;
  previousNewUsers: number;
  percentChange: number;
  isIncrease: boolean;
  isSignificant: boolean;
}

// Similar interfaces for PageAnalysisResult, DeviceLocationAnalysisResult,
// EventAnalysisResult, SearchKeywordAnalysisResult
```

### AppConfig

```typescript
interface AppConfig {
  ga4PropertyId: string;
  serviceAccountKeyPath?: string;
  defaultComparisonPeriod: ComparisonType;
  verbose: boolean;
  enableGSC: boolean;
  gscSiteUrl?: string;
  maxRetries?: number;
  requestTimeout?: number;
  dataLimit?: number;
  enablePerformanceMonitoring?: boolean;
}
```

## Error Handling

### Error Classes

```typescript
import {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "ga4-analyzer";
```

**Error Hierarchy:**

```
Error
└── GA4AnalyzerError (base class)
    ├── ConfigurationError    // Invalid configuration
    ├── AuthenticationError   // Auth failures
    ├── ApiError             // API errors
    │   └── QuotaExceededError  // Quota exceeded
    ├── NetworkError         // Network issues
    └── ParseError           // Query parsing errors
```

### Error Handling Utilities

```typescript
import { ErrorHandler, type ErrorSeverity } from "ga4-analyzer";

// Format error for users
const message = ErrorHandler.formatUserMessage(error);

// Get error severity
const severity: ErrorSeverity = ErrorHandler.getSeverity(error);
// Returns: "critical" | "error" | "warning"

// Check if retryable
const canRetry = ErrorHandler.isRetryable(error);

// Log error with context
ErrorHandler.logError(error, { operation: "fetchData" }, verbose);

// Wrap error with context
const wrapped = ErrorHandler.wrapError(
  originalError,
  "analyzeTrafficSources",
  { propertyId: "123" }
);
```

### Example Error Handling

```typescript
import { QueryOrchestrator, ApiError, QuotaExceededError } from "ga4-analyzer";

try {
  const orchestrator = new QueryOrchestrator();
  const result = await orchestrator.execute("昨日のアクセス");
  console.log(result);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error("API quota exceeded. Please try again later.");
  } else if (error instanceof ApiError) {
    console.error("API error:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Usage Examples

### Example 1: Basic Analysis

```typescript
import { QueryOrchestrator } from "ga4-analyzer";

async function analyzeYesterday() {
  const orchestrator = new QueryOrchestrator();

  try {
    const result = await orchestrator.execute("昨日のアクセス増の要因");
    console.log(result.report);
  } catch (error) {
    console.error("Analysis failed:", error);
  }
}

analyzeYesterday();
```

### Example 2: Custom Date Range

```typescript
import { AnalysisEngine, GA4ApiClient, ComparisonLogic } from "ga4-analyzer";

async function compareSpecificDates() {
  const client = new GA4ApiClient();
  await client.initialize(credentials, "123456789");

  const engine = new AnalysisEngine(client);
  const logic = new ComparisonLogic();

  const result = await engine.analyzeTrafficSources(
    new Date("2026-03-03"),
    new Date("2026-02-03"), // Compare with one month ago
    "123456789"
  );

  const topIncreases = logic.topN(
    logic.filterIncreases(result.metrics.map(m => ({
      label: `${m.source} / ${m.medium}`,
      current: m.currentSessions,
      previous: m.previousSessions,
      absoluteChange: m.currentSessions - m.previousSessions,
      percentChange: m.percentChange,
      isSignificant: m.isSignificant,
    }))),
    10
  );

  console.log("Top 10 traffic source increases:", topIncreases);
}
```

### Example 3: Multi-Axis Parallel Analysis

```typescript
import { AnalysisEngine, GA4ApiClient, GSCApiClient } from "ga4-analyzer";

async function comprehensiveAnalysis() {
  const ga4Client = new GA4ApiClient();
  const gscClient = new GSCApiClient();

  await ga4Client.initialize(credentials, "123456789");
  await gscClient.initialize(credentials);

  const engine = new AnalysisEngine(ga4Client, gscClient);

  const results = await engine.analyzeAll(
    new Date("2026-03-03"),
    new Date("2026-03-02"),
    "123456789",
    {
      enableGSC: true,
      siteUrl: "https://example.com",
    }
  );

  // All analyses run in parallel (faster)
  console.log("Sources:", results.sources?.summary);
  console.log("Pages:", results.pages?.summary);
  console.log("Devices:", results.devices?.summary);
  console.log("Events:", results.events?.summary);
  console.log("Keywords:", results.keywords?.summary);

  // Check for errors
  if (results.errors.size > 0) {
    console.error("Some analyses failed:");
    results.errors.forEach((error, axis) => {
      console.error(`- ${axis}:`, error.message);
    });
  }
}
```

### Example 4: Custom Configuration

```typescript
import { ConfigurationLoader } from "ga4-analyzer";

async function customConfig() {
  const loader = new ConfigurationLoader();

  // Load and validate config
  const config = await loader.load();

  // Override with runtime values
  const customConfig = {
    ...config,
    verbose: true,
    enableGSC: false,
    maxRetries: 5,
    requestTimeout: 60000,
  };

  // Validate
  const validation = loader.validate(customConfig);
  if (!validation.valid) {
    console.error("Invalid configuration:", validation.errors);
    return;
  }

  // Use custom config
  const orchestrator = new QueryOrchestrator();
  const result = await orchestrator.execute("昨日のアクセス", {
    verbose: customConfig.verbose,
  });
}
```

## Advanced Topics

### Performance Monitoring

```typescript
import { PerformanceMonitor } from "ga4-analyzer";

const monitor = new PerformanceMonitor(true);

// Measure operation
const result = await monitor.measure("fetchData", async () => {
  return await fetchDataFromAPI();
});

// Get statistics
const stats = monitor.getStats("fetchData");
console.log("Average duration:", stats?.avg, "ms");
console.log("P95 duration:", stats?.p95, "ms");

// Generate report
const report = monitor.generateReport();
console.log(report);
```

### Custom Logging

```typescript
import { Logger, LogLevel, initializeLogger } from "ga4-analyzer";

// Initialize custom logger
const logger = initializeLogger(LogLevel.DEBUG);

logger.debug("Debug message", { userId: "123" });
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");

// Get global logger
import { getLogger } from "ga4-analyzer";
const log = getLogger();
log.info("Using global logger");
```

### Graceful Degradation

GA4 Analyzer implements graceful degradation for GSC integration:

```typescript
// GSC failure doesn't stop GA4 analysis
const results = await engine.analyzeAll(targetDate, comparisonDate, propertyId, {
  enableGSC: true,
  siteUrl: "https://example.com",
});

// Check which analyses succeeded
if (results.sources) console.log("GA4 sources: OK");
if (results.pages) console.log("GA4 pages: OK");
if (results.keywords) console.log("GSC keywords: OK");

// Check for errors
if (results.errors.has("keywords")) {
  console.warn("GSC analysis failed, but GA4 data is still available");
}
```

---

For more information, see:
- [README.md](README.md) - User guide and setup
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guide
- [CHANGELOG.md](CHANGELOG.md) - Version history
