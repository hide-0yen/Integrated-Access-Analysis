/**
 * ExploratoryAnalysisOrchestrator
 * 探索的分析のE2Eフローを統合管理
 */

import { LLMQueryParser } from "@/domain/llm-query-parser";
import { ExploratoryQueryBuilder } from "@/domain/exploratory-query-builder";
import { InteractiveConfirmation } from "@/presentation/interactive-confirmation";
import { TimeframeAnalysis } from "@/application/timeframe-analysis";
import { DetectionLogic } from "@/domain/detection-logic";
import type { GA4ApiClient } from "@/infrastructure/ga4-client";
import type { ClaudeClient } from "@/infrastructure/claude-client";
import type { ParsedExploratoryQuery } from "@/domain/types/exploratory-query";
import type { DetectionResult } from "@/domain/detection-logic";
import type {
  Statistics,
  TimeSeriesDataPoint,
} from "@/domain/types/exploratory-query";

/**
 * 探索的分析結果
 */
export interface ExploratoryAnalysisResult {
  query: ParsedExploratoryQuery;
  timeSeries: TimeSeriesDataPoint[];
  statistics: Statistics;
  detections: DetectionResult[];
  summary: {
    totalDataPoints: number;
    detectedCount: number;
    detectionRate: number;
  };
}

/**
 * ExploratoryAnalysisOrchestratorクラス
 */
export class ExploratoryAnalysisOrchestrator {
  private llmParser: LLMQueryParser;
  private queryBuilder: ExploratoryQueryBuilder;
  private timeframeAnalysis: TimeframeAnalysis;
  private detectionLogic: DetectionLogic;

  constructor(
    claudeClient: ClaudeClient,
    ga4Client: GA4ApiClient,
    propertyId: string,
  ) {
    this.llmParser = new LLMQueryParser({ claudeClient });
    this.queryBuilder = new ExploratoryQueryBuilder();
    this.timeframeAnalysis = new TimeframeAnalysis(ga4Client, propertyId);
    this.detectionLogic = new DetectionLogic();
  }

  /**
   * 探索的分析を実行
   */
  async analyze(
    queryText: string,
    options?: {
      skipConfirmation?: boolean;
      baseDate?: Date;
    },
  ): Promise<ExploratoryAnalysisResult> {
    // 1. LLMでクエリを解析
    let rawParsed;
    try {
      rawParsed = await this.llmParser.parse(queryText);
    } catch (error) {
      // LLM解析失敗時はエラーを投げる
      throw new Error(
        `Failed to parse query with LLM: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 2. クエリをビルド（日付解決、デフォルト値補完）
    const parsedQuery = this.queryBuilder.build(
      rawParsed,
      options?.baseDate ?? new Date(),
    );

    // 3. 確認が必要な場合、対話的確認
    if (parsedQuery.needsConfirmation && !options?.skipConfirmation) {
      const confirmation = new InteractiveConfirmation();
      const confirmResult = await confirmation.confirm(
        parsedQuery.confirmationPrompts,
        parsedQuery.detection,
      );

      if (!confirmResult.confirmed) {
        throw new Error("User cancelled the analysis");
      }

      // 調整された検出設定を適用
      if (confirmResult.adjustedDetection) {
        parsedQuery.detection = confirmResult.adjustedDetection;
      }
    }

    // 4. Timeframe分析（GA4データ取得・統計算出）
    const analysisResult = await this.timeframeAnalysis.analyze(parsedQuery);

    // 5. 検出実行
    const detections = this.detectionLogic.detect(
      analysisResult.timeSeries,
      analysisResult.statistics,
      parsedQuery.detection,
    );

    // 6. サマリー作成
    const detectedCount = detections.filter((d) => d.isDetected).length;
    const summary = {
      totalDataPoints: detections.length,
      detectedCount,
      detectionRate:
        detections.length > 0 ? detectedCount / detections.length : 0,
    };

    return {
      query: parsedQuery,
      timeSeries: analysisResult.timeSeries,
      statistics: analysisResult.statistics,
      detections,
      summary,
    };
  }

  /**
   * ランキング付き結果を取得
   */
  async analyzeWithRanking(
    queryText: string,
    options?: {
      skipConfirmation?: boolean;
      baseDate?: Date;
      topN?: number;
      rankBy?: "changeRate" | "value";
    },
  ): Promise<ExploratoryAnalysisResult> {
    const result = await this.analyze(queryText, options);

    // ランキング適用
    const topN = options?.topN ?? 10;
    const rankBy = options?.rankBy ?? "changeRate";

    const ranked =
      rankBy === "changeRate"
        ? this.detectionLogic.rankByChangeRate(result.detections, true)
        : this.detectionLogic.rankByValue(result.detections, true);

    const topDetections = this.detectionLogic.topN(ranked, topN);

    return {
      ...result,
      detections: topDetections,
      summary: {
        ...result.summary,
        detectedCount: topDetections.length,
      },
    };
  }
}
