/**
 * QueryOrchestrator
 * 全体のワークフローを制御する
 */

import { QueryParser } from "@/domain/query-parser";
import { QueryRouter } from "@/domain/query-router";
import { ClaudeClient } from "@/infrastructure/claude-client";
import { ExploratoryAnalysisOrchestrator } from "@/application/exploratory-analysis-orchestrator";
import { ConfigurationLoader } from "@/infrastructure/config-loader";
import { AuthenticationManager } from "@/infrastructure/auth-manager";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import { GSCApiClient } from "@/infrastructure/gsc-client";
import { PerformanceMonitor } from "@/infrastructure/performance-monitor";
import { AnalysisEngine } from "@/application/analysis-engine";
import {
  InsightGenerator,
  type IntegratedAnalysisResult,
} from "@/application/insight-generator";
import type { AppConfig } from "@/types/models";
import type { ExploratoryAnalysisResult } from "@/application/exploratory-analysis-orchestrator";

/**
 * クエリオプション
 */
export interface QueryOptions {
  verbose?: boolean;
  compareType?: string;
  propertyId?: string;
  forceComparisonMode?: boolean; // true の場合、自動判定をスキップして強制的に比較分析を実行
}

/**
 * QueryOrchestratorクラス
 */
export class QueryOrchestrator {
  private queryParser: QueryParser;
  private queryRouter: QueryRouter;
  private configLoader: ConfigurationLoader;
  private authManager: AuthenticationManager;
  private analysisEngine: AnalysisEngine;
  private insightGenerator: InsightGenerator;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.queryParser = new QueryParser();
    this.queryRouter = new QueryRouter();
    this.configLoader = new ConfigurationLoader();
    this.authManager = new AuthenticationManager();
    this.analysisEngine = new AnalysisEngine();
    this.insightGenerator = new InsightGenerator();
    this.performanceMonitor = new PerformanceMonitor(false);
  }

  /**
   * クエリを実行する
   */
  async execute(
    rawQuery: string,
    options: QueryOptions = {},
  ): Promise<IntegratedAnalysisResult | ExploratoryAnalysisResult> {
    try {
      // forceComparisonMode が true の場合、自動判定をスキップして比較分析を実行
      if (options.forceComparisonMode) {
        if (options.verbose) {
          console.log("Force comparison mode: skipping query classification");
        }
        return await this.executeComparisonAnalysis(rawQuery, options);
      }

      // 0. クエリタイプを判定
      const classification = this.queryRouter.classify(rawQuery);

      if (options.verbose) {
        console.log("Query classification:", {
          type: classification.type,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        });
      }

      // 探索的クエリの場合、ExploratoryAnalysisOrchestratorに委譲
      if (classification.type === "exploratory") {
        return await this.executeExploratoryAnalysis(rawQuery, options);
      }

      // 比較分析クエリの場合、既存フローを実行
      return await this.executeComparisonAnalysis(rawQuery, options);
    } catch (error) {
      if (options.verbose) {
        console.error("Error during query execution:", error);
      }
      throw error;
    }
  }

  /**
   * 探索的分析を実行
   */
  private async executeExploratoryAnalysis(
    rawQuery: string,
    options: QueryOptions = {},
  ): Promise<ExploratoryAnalysisResult> {
    // 設定を読み込み
    const config = await this.configLoader.load();

    // Claude APIキーチェック
    if (!config.claude?.apiKey) {
      throw new Error(
        "Claude API key not configured. Set ANTHROPIC_API_KEY environment variable or configure in .ga4rc.json",
      );
    }

    // オプションで設定を上書き
    if (options.propertyId) {
      config.ga4PropertyId = options.propertyId;
    }

    // 認証情報を読み込み
    const credentials = this.authManager.loadCredentials({
      serviceAccountKeyPath: config.serviceAccountKeyPath,
      useApplicationDefaultCredentials: !config.serviceAccountKeyPath,
    });

    // GA4クライアントを初期化
    const ga4Client = new GA4ApiClient();
    await ga4Client.initialize({
      propertyId: config.ga4PropertyId,
      credentials: credentials,
    });

    // Claude クライアントを初期化
    const claudeClient = new ClaudeClient({
      apiKey: config.claude.apiKey,
      model: config.claude.model,
      maxTokens: config.claude.maxTokens,
    });

    // ExploratoryAnalysisOrchestratorを実行
    const orchestrator = new ExploratoryAnalysisOrchestrator(
      claudeClient,
      ga4Client,
      config.ga4PropertyId,
    );

    return orchestrator.analyzeWithRanking(rawQuery, {
      skipConfirmation: false,
      topN: 10,
      rankBy: "changeRate",
    });
  }

  /**
   * 比較分析を実行（既存フロー）
   */
  private async executeComparisonAnalysis(
    rawQuery: string,
    options: QueryOptions = {},
  ): Promise<IntegratedAnalysisResult> {
    try {
      // 1. クエリを解析
      if (options.verbose) {
        console.log("Parsing query...");
      }
      const parsedQuery = await this.performanceMonitor.measure(
        "query-parsing",
        () => Promise.resolve(this.queryParser.parse(rawQuery)),
      );

      if (options.verbose) {
        console.log("Parsed query:", {
          targetDate: parsedQuery.targetDate.toISOString(),
          comparisonDate: parsedQuery.comparisonDate.toISOString(),
          analysisType: parsedQuery.analysisType,
          comparisonType: parsedQuery.comparisonType,
        });
      }

      // 2. 設定を読み込み
      if (options.verbose) {
        console.log("Loading configuration...");
      }
      const config = await this.performanceMonitor.measure(
        "config-loading",
        async () => this.configLoader.load(),
      );

      // オプションで設定を上書き
      if (options.propertyId) {
        config.ga4PropertyId = options.propertyId;
      }

      // パフォーマンスモニタリングを設定に基づいて有効化
      if (config.enablePerformanceMonitoring) {
        this.performanceMonitor.enable();
      }

      if (options.verbose) {
        console.log("Configuration loaded:", {
          ga4PropertyId: config.ga4PropertyId,
          defaultComparisonPeriod: config.defaultComparisonPeriod,
          enablePerformanceMonitoring: config.enablePerformanceMonitoring,
        });
      }

      // 3. 認証情報を読み込み
      if (options.verbose) {
        console.log("Loading credentials...");
      }
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const credentials = await this.authManager.loadCredentials({
        serviceAccountKeyPath: config.serviceAccountKeyPath,
        useApplicationDefaultCredentials: !config.serviceAccountKeyPath,
      });

      if (options.verbose) {
        console.log("Credentials loaded successfully");
      }

      // 4. GA4クライアントを初期化
      if (options.verbose) {
        console.log("Initializing GA4 client...");
      }
      const ga4Client = new GA4ApiClient();
      await ga4Client.initialize({
        propertyId: config.ga4PropertyId,
        credentials: credentials,
      });

      if (options.verbose) {
        console.log("GA4 client initialized successfully");
      }

      // 5. GSCクライアントを初期化（オプション）
      let gscClient: GSCApiClient | null = null;
      if (config.enableGSC && config.gscSiteUrl) {
        try {
          if (options.verbose) {
            console.log("Initializing GSC client...");
          }
          gscClient = new GSCApiClient();
          await gscClient.initialize({
            siteUrl: config.gscSiteUrl,
            credentials: credentials,
          });
          if (options.verbose) {
            console.log("GSC client initialized successfully");
          }
        } catch (error) {
          // Graceful Degradation: GSC失敗時はGA4のみ継続
          if (options.verbose) {
            console.warn(
              "GSC initialization failed. Continuing with GA4 only:",
              error instanceof Error ? error.message : error,
            );
          }
          gscClient = null;
        }
      }

      // 6. Multi-axis分析を並列実行
      const axisCount = gscClient ? 5 : 4;
      if (options.verbose) {
        console.log(
          `Starting multi-axis analysis (${String(axisCount)} axes in parallel)...`,
        );
      }

      // GA4の4軸分析
      const ga4AnalysisPromises = [
        this.analysisEngine.analyzeTrafficSources(parsedQuery, ga4Client),
        this.analysisEngine.analyzePages(parsedQuery, ga4Client),
        this.analysisEngine.analyzeDevicesAndLocations(parsedQuery, ga4Client),
        this.analysisEngine.analyzeEvents(parsedQuery, ga4Client),
      ] as const;

      // GSC分析（オプション）
      const gscAnalysisPromise = gscClient
        ? this.analysisEngine.analyzeSearchKeywords(parsedQuery, gscClient)
        : null;

      // 並列実行（パフォーマンス計測）
      const [ga4Results, gscResult] = await this.performanceMonitor.measure(
        "multi-axis-analysis",
        async () =>
          Promise.all([
            Promise.allSettled(ga4AnalysisPromises),
            gscAnalysisPromise
              ? Promise.allSettled([gscAnalysisPromise])
              : null,
          ]),
      );

      const [
        sourceAnalysis,
        pageAnalysis,
        deviceLocationAnalysis,
        eventAnalysis,
      ] = ga4Results;
      const searchKeywordAnalysis = gscResult?.[0];

      if (options.verbose) {
        console.log("Multi-axis analysis completed:");
        console.log(
          "- Traffic sources:",
          sourceAnalysis.status === "fulfilled" ? "✓" : "✗",
        );
        console.log(
          "- Pages:",
          pageAnalysis.status === "fulfilled" ? "✓" : "✗",
        );
        console.log(
          "- Devices/Locations:",
          deviceLocationAnalysis.status === "fulfilled" ? "✓" : "✗",
        );
        console.log(
          "- Events:",
          eventAnalysis.status === "fulfilled" ? "✓" : "✗",
        );
        if (gscClient) {
          console.log(
            "- Search Keywords (GSC):",
            searchKeywordAnalysis?.status === "fulfilled" ? "✓" : "✗",
          );
        }
      }

      // 分析結果を展開（失敗した場合はundefined）
      const sources =
        sourceAnalysis.status === "fulfilled"
          ? sourceAnalysis.value
          : undefined;
      const pages =
        pageAnalysis.status === "fulfilled" ? pageAnalysis.value : undefined;
      const deviceLocations =
        deviceLocationAnalysis.status === "fulfilled"
          ? deviceLocationAnalysis.value
          : undefined;
      const events =
        eventAnalysis.status === "fulfilled" ? eventAnalysis.value : undefined;
      const searchKeywords =
        searchKeywordAnalysis?.status === "fulfilled"
          ? searchKeywordAnalysis.value
          : undefined;

      // 少なくとも1つの軸が成功していることを確認
      if (
        !sources &&
        !pages &&
        !deviceLocations &&
        !events &&
        !searchKeywords
      ) {
        throw new Error("All analysis axes failed. Cannot generate report.");
      }

      // 6. 相関分析を実行(GSC有効かつGA4とGSCの両方が成功している場合)
      let correlation = undefined;
      if (gscClient && sources && searchKeywords) {
        try {
          if (options.verbose) {
            console.log("Performing GA4-GSC correlation analysis...");
          }
          correlation = await this.performanceMonitor.measure(
            "correlation-analysis",
            async () =>
              this.analysisEngine.analyzeCorrelation(
                parsedQuery,
                ga4Client,
                gscClient,
              ),
          );
          if (options.verbose) {
            console.log("Correlation analysis completed successfully");
          }
        } catch (error) {
          // Graceful Degradation: 相関分析失敗時はスキップ
          if (options.verbose) {
            console.warn(
              "Correlation analysis failed. Skipping correlation insights:",
              error instanceof Error ? error.message : error,
            );
          }
          correlation = undefined;
        }
      }

      // 7. サマリーメトリクスを計算
      const summary = this.calculateSummary(sources, pages, deviceLocations);

      if (options.verbose) {
        console.log("Summary metrics:", summary);
      }

      // 8. 統合分析結果を構築
      const analysis: IntegratedAnalysisResult = {
        query: parsedQuery,
        summary,
        sourceAnalysis: sources,
        pageAnalysis: pages,
        deviceLocationAnalysis: deviceLocations,
        eventAnalysis: events,
        searchKeywordAnalysis: searchKeywords,
        correlationAnalysis: correlation,
        insights: [],
      };

      // 8. インサイトを生成
      if (options.verbose) {
        console.log("Generating insights...");
      }
      const report = await this.performanceMonitor.measure(
        "insight-generation",
        () => Promise.resolve(this.insightGenerator.generate(analysis)),
      );

      if (options.verbose) {
        console.log("Insights generated successfully");
      }

      // レポートをinsightsに格納
      analysis.insights = [report];

      // パフォーマンスレポートを出力
      if (this.performanceMonitor.isEnabled() && options.verbose) {
        this.performanceMonitor.printReport();
      }

      return analysis;
    } catch (error) {
      if (options.verbose) {
        console.error("Error during comparison analysis execution:", error);
      }
      throw error;
    } finally {
      // パフォーマンスモニターをクリア
      if (this.performanceMonitor.isEnabled()) {
        this.performanceMonitor.clear();
      }
    }
  }

  /**
   * サマリーメトリクスを計算する
   */
  private calculateSummary(
    sourceAnalysis?: {
      sources: Array<{
        currentSessions: number;
        previousSessions: number;
      }>;
    },
    pageAnalysis?: {
      pages: Array<{
        currentSessions: number;
        previousSessions: number;
      }>;
    },
    deviceLocationAnalysis?: {
      deviceLocations: Array<{
        currentSessions: number;
        previousSessions: number;
      }>;
    },
  ) {
    // 優先順位: sourceAnalysis > deviceLocationAnalysis > pageAnalysis
    let currentTotalSessions = 0;
    let previousTotalSessions = 0;

    if (sourceAnalysis) {
      currentTotalSessions = sourceAnalysis.sources.reduce(
        (sum, source) => sum + source.currentSessions,
        0,
      );
      previousTotalSessions = sourceAnalysis.sources.reduce(
        (sum, source) => sum + source.previousSessions,
        0,
      );
    } else if (deviceLocationAnalysis) {
      currentTotalSessions = deviceLocationAnalysis.deviceLocations.reduce(
        (sum, dl) => sum + dl.currentSessions,
        0,
      );
      previousTotalSessions = deviceLocationAnalysis.deviceLocations.reduce(
        (sum, dl) => sum + dl.previousSessions,
        0,
      );
    } else if (pageAnalysis) {
      currentTotalSessions = pageAnalysis.pages.reduce(
        (sum, page) => sum + page.currentSessions,
        0,
      );
      previousTotalSessions = pageAnalysis.pages.reduce(
        (sum, page) => sum + page.previousSessions,
        0,
      );
    }

    const absoluteChange = currentTotalSessions - previousTotalSessions;
    const percentChange =
      previousTotalSessions === 0
        ? currentTotalSessions > 0
          ? Infinity
          : 0
        : (absoluteChange / previousTotalSessions) * 100;

    return {
      currentTotalSessions,
      previousTotalSessions,
      absoluteChange,
      percentChange,
    };
  }

  /**
   * 設定をチェックする
   */
  async checkConfig(): Promise<AppConfig> {
    return this.configLoader.load();
  }

  /**
   * 設定を検証する
   */
  async validateConfig(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const config = await this.configLoader.load();
      // eslint-disable-next-line @typescript-eslint/return-await
      return this.configLoader.validate(config);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          error instanceof Error ? error.message : "Unknown error occurred",
        ],
      };
    }
  }
}
