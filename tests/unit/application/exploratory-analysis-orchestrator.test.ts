import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExploratoryAnalysisOrchestrator } from "@/application/exploratory-analysis-orchestrator";
import { LLMQueryParser } from "@/domain/llm-query-parser";
import { ExploratoryQueryBuilder } from "@/domain/exploratory-query-builder";
import { TimeframeAnalysis } from "@/application/timeframe-analysis";
import { DetectionLogic } from "@/domain/detection-logic";
import type { ClaudeClient } from "@/infrastructure/claude-client";
import type { GA4ApiClient } from "@/infrastructure/ga4-client";
import type {
  RawParsedQuery,
  ParsedExploratoryQuery,
  TimeSeriesDataPoint,
  Statistics,
  DetectionResult,
} from "@/domain/types/exploratory-query";

// モジュールをモック
vi.mock("@/domain/llm-query-parser");
vi.mock("@/domain/exploratory-query-builder");
vi.mock("@/application/timeframe-analysis");
vi.mock("@/domain/detection-logic");

describe("ExploratoryAnalysisOrchestrator", () => {
  let orchestrator: ExploratoryAnalysisOrchestrator;
  let mockClaudeClient: ClaudeClient;
  let mockGA4Client: GA4ApiClient;
  let mockLLMParser: LLMQueryParser;
  let mockQueryBuilder: ExploratoryQueryBuilder;
  let mockTimeframeAnalysis: TimeframeAnalysis;
  let mockDetectionLogic: DetectionLogic;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClaudeClient = {} as ClaudeClient;
    mockGA4Client = {} as GA4ApiClient;

    orchestrator = new ExploratoryAnalysisOrchestrator(
      mockClaudeClient,
      mockGA4Client,
      "123456789",
    );

    mockLLMParser = (orchestrator as any).llmParser;
    mockQueryBuilder = (orchestrator as any).queryBuilder;
    mockTimeframeAnalysis = (orchestrator as any).timeframeAnalysis;
    mockDetectionLogic = (orchestrator as any).detectionLogic;
  });

  describe("analyze", () => {
    it("should execute full E2E flow successfully", async () => {
      // モックデータ準備
      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-01",
          endDate: "2024-03-01",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const timeSeries: TimeSeriesDataPoint[] = [
        { date: "2024-02-01", value: 100 },
        { date: "2024-02-02", value: 150 },
        { date: "2024-02-03", value: 200 },
      ];

      const statistics: Statistics = {
        mean: 150,
        stdDev: 50,
        min: 100,
        max: 200,
        median: 150,
        count: 3,
      };

      const detections: DetectionResult[] = [
        {
          date: "2024-02-03",
          value: 200,
          isDetected: true,
          changeRate: 33.33,
          reason: "平均比 +33.3%",
        },
      ];

      // モック設定
      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries,
        statistics,
        totalValue: 450,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue(detections);

      // 実行
      const result =
        await orchestrator.analyze("直近1ヶ月でセッションが増加した日");

      // 検証
      expect(mockLLMParser.parse).toHaveBeenCalledWith(
        "直近1ヶ月でセッションが増加した日",
      );
      expect(mockQueryBuilder.build).toHaveBeenCalledWith(
        rawParsed,
        expect.any(Date),
      );
      expect(mockTimeframeAnalysis.analyze).toHaveBeenCalledWith(parsedQuery);
      expect(mockDetectionLogic.detect).toHaveBeenCalledWith(
        timeSeries,
        statistics,
        parsedQuery.detection,
      );

      expect(result.query).toEqual(parsedQuery);
      expect(result.timeSeries).toEqual(timeSeries);
      expect(result.statistics).toEqual(statistics);
      expect(result.detections).toEqual(detections);
      expect(result.summary).toEqual({
        totalDataPoints: 1,
        detectedCount: 1,
        detectionRate: 1,
      });
    });

    it("should skip confirmation when skipConfirmation is true", async () => {
      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-01",
          endDate: "2024-03-01",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: true,
        confirmationPrompts: ["テストプロンプト"],
      };

      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries: [],
        statistics: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          median: 0,
          count: 0,
        },
        totalValue: 0,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue([]);

      await orchestrator.analyze("test query", { skipConfirmation: true });

      // InteractiveConfirmation は呼ばれない（skipConfirmation: true）
      expect(mockTimeframeAnalysis.analyze).toHaveBeenCalled();
    });

    it("should throw error when LLM parsing fails", async () => {
      vi.spyOn(mockLLMParser, "parse").mockRejectedValue(
        new Error("LLM API error"),
      );

      await expect(orchestrator.analyze("invalid query")).rejects.toThrowError(
        "Failed to parse query with LLM: LLM API error",
      );
    });

    it("should use baseDate option when provided", async () => {
      const customBaseDate = new Date("2024-03-15");

      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-15",
          endDate: "2024-03-15",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries: [],
        statistics: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          median: 0,
          count: 0,
        },
        totalValue: 0,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue([]);

      await orchestrator.analyze("test query", { baseDate: customBaseDate });

      expect(mockQueryBuilder.build).toHaveBeenCalledWith(
        rawParsed,
        customBaseDate,
      );
    });
  });

  describe("analyzeWithRanking", () => {
    it("should return top N results ranked by changeRate", async () => {
      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-01",
          endDate: "2024-03-01",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const detections: DetectionResult[] = [
        {
          date: "2024-02-01",
          value: 100,
          isDetected: true,
          changeRate: 10,
          reason: "平均比 +10%",
        },
        {
          date: "2024-02-02",
          value: 200,
          isDetected: true,
          changeRate: 50,
          reason: "平均比 +50%",
        },
        {
          date: "2024-02-03",
          value: 150,
          isDetected: true,
          changeRate: 30,
          reason: "平均比 +30%",
        },
      ];

      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries: [],
        statistics: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          median: 0,
          count: 0,
        },
        totalValue: 0,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue(detections);
      vi.spyOn(mockDetectionLogic, "rankByChangeRate").mockReturnValue([
        detections[1], // 50%
        detections[2], // 30%
        detections[0], // 10%
      ]);
      vi.spyOn(mockDetectionLogic, "topN").mockReturnValue([
        detections[1],
        detections[2],
      ]);

      const result = await orchestrator.analyzeWithRanking("test query", {
        topN: 2,
        rankBy: "changeRate",
      });

      expect(mockDetectionLogic.rankByChangeRate).toHaveBeenCalledWith(
        detections,
        true,
      );
      expect(mockDetectionLogic.topN).toHaveBeenCalledWith(
        [detections[1], detections[2], detections[0]],
        2,
      );
      expect(result.detections).toHaveLength(2);
      expect(result.summary.detectedCount).toBe(2);
    });

    it("should rank by value when rankBy is value", async () => {
      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-01",
          endDate: "2024-03-01",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const detections: DetectionResult[] = [
        {
          date: "2024-02-01",
          value: 100,
          isDetected: true,
          changeRate: 10,
          reason: "平均比 +10%",
        },
      ];

      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries: [],
        statistics: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          median: 0,
          count: 0,
        },
        totalValue: 0,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue(detections);
      vi.spyOn(mockDetectionLogic, "rankByValue").mockReturnValue(detections);
      vi.spyOn(mockDetectionLogic, "topN").mockReturnValue(detections);

      await orchestrator.analyzeWithRanking("test query", {
        rankBy: "value",
      });

      expect(mockDetectionLogic.rankByValue).toHaveBeenCalledWith(
        detections,
        true,
      );
    });

    it("should use default topN of 10", async () => {
      const rawParsed: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      };

      const parsedQuery: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-02-01",
          endDate: "2024-03-01",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      vi.spyOn(mockLLMParser, "parse").mockResolvedValue(rawParsed);
      vi.spyOn(mockQueryBuilder, "build").mockReturnValue(parsedQuery);
      vi.spyOn(mockTimeframeAnalysis, "analyze").mockResolvedValue({
        timeSeries: [],
        statistics: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          median: 0,
          count: 0,
        },
        totalValue: 0,
      });
      vi.spyOn(mockDetectionLogic, "detect").mockReturnValue([]);
      vi.spyOn(mockDetectionLogic, "rankByChangeRate").mockReturnValue([]);
      vi.spyOn(mockDetectionLogic, "topN").mockReturnValue([]);

      await orchestrator.analyzeWithRanking("test query");

      expect(mockDetectionLogic.topN).toHaveBeenCalledWith([], 10);
    });
  });
});
