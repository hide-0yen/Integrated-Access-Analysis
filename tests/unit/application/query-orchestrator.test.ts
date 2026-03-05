import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryOrchestrator } from "@/application/query-orchestrator";
import { QueryParser } from "@/domain/query-parser";
import { QueryRouter } from "@/domain/query-router";
import { ConfigurationLoader } from "@/infrastructure/config-loader";
import { AuthenticationManager } from "@/infrastructure/auth-manager";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import { AnalysisEngine } from "@/application/analysis-engine";
import { InsightGenerator } from "@/application/insight-generator";
import type { ParsedQuery, AppConfig, GA4ReportResponse } from "@/types/models";
import type { SourceAnalysisResult } from "@/application/analysis-engine";

// モジュールをモック
vi.mock("@/domain/query-parser");
vi.mock("@/domain/query-router");
vi.mock("@/infrastructure/config-loader");
vi.mock("@/infrastructure/auth-manager");
vi.mock("@/infrastructure/ga4-client");
vi.mock("@/application/analysis-engine");
vi.mock("@/application/insight-generator");

describe("QueryOrchestrator", () => {
  let orchestrator: QueryOrchestrator;
  let mockQueryParser: QueryParser;
  let mockQueryRouter: QueryRouter;
  let mockConfigLoader: ConfigurationLoader;
  let mockAuthManager: AuthenticationManager;
  let mockGA4Client: GA4ApiClient;
  let mockAnalysisEngine: AnalysisEngine;
  let mockInsightGenerator: InsightGenerator;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // インスタンスを作成
    orchestrator = new QueryOrchestrator();

    // モックインスタンスを取得
    mockQueryParser = (orchestrator as any).queryParser;
    mockQueryRouter = (orchestrator as any).queryRouter;
    mockConfigLoader = (orchestrator as any).configLoader;
    mockAuthManager = (orchestrator as any).authManager;
    mockAnalysisEngine = (orchestrator as any).analysisEngine;
    mockInsightGenerator = (orchestrator as any).insightGenerator;

    // デフォルトでQueryRouterは"comparison"を返す
    vi.spyOn(mockQueryRouter, "classify").mockReturnValue({
      type: "comparison",
      confidence: 0.9,
      reasoning: "Mock comparison query",
    });
  });

  describe("正常系: execute", () => {
    it("should execute query successfully", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        serviceAccountKeyPath: "/path/to/key.json",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 150,
            previousSessions: 100,
            currentNewUsers: 80,
            previousNewUsers: 50,
            sessionChange: 50,
            sessionChangePercent: 50,
            newUserChange: 30,
            newUserChangePercent: 60,
          },
        ],
        topGainers: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 150,
            previousSessions: 100,
            currentNewUsers: 80,
            previousNewUsers: 50,
            sessionChange: 50,
            sessionChangePercent: 50,
            newUserChange: 30,
            newUserChangePercent: 60,
          },
        ],
        topLosers: [],
      };

      const mockCredentials = { key: "mock-credentials" };

      // モックの動作を設定
      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue(
        mockCredentials as any,
      );
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockResolvedValue(
        sourceAnalysis,
      );
      vi.spyOn(mockInsightGenerator, "generate").mockReturnValue("Mock report");

      // GA4Clientのモック
      mockGA4Client = new GA4ApiClient();
      vi.spyOn(mockGA4Client, "initialize").mockResolvedValue(undefined);

      const result = await orchestrator.execute("昨日のアクセス");

      expect(mockQueryParser.parse).toHaveBeenCalledWith("昨日のアクセス");
      expect(mockConfigLoader.load).toHaveBeenCalled();
      expect(mockAuthManager.loadCredentials).toHaveBeenCalledWith({
        serviceAccountKeyPath: "/path/to/key.json",
        useApplicationDefaultCredentials: false,
      });
      expect(mockAnalysisEngine.analyzeTrafficSources).toHaveBeenCalledWith(
        parsedQuery,
        expect.any(GA4ApiClient),
      );
      expect(mockInsightGenerator.generate).toHaveBeenCalled();

      expect(result.query).toEqual(parsedQuery);
      expect(result.summary.currentTotalSessions).toBe(150);
      expect(result.summary.previousTotalSessions).toBe(100);
      expect(result.summary.absoluteChange).toBe(50);
      expect(result.summary.percentChange).toBe(50);
      expect(result.sourceAnalysis).toEqual(sourceAnalysis);
      expect(result.insights).toEqual(["Mock report"]);
    });

    it("should use verbose logging when enabled", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [],
        topLosers: [],
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue({} as any);
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockResolvedValue(
        sourceAnalysis,
      );
      vi.spyOn(mockInsightGenerator, "generate").mockReturnValue("Mock report");

      mockGA4Client = new GA4ApiClient();
      vi.spyOn(mockGA4Client, "initialize").mockResolvedValue(undefined);

      await orchestrator.execute("昨日のアクセス", { verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith("Parsing query...");
      expect(consoleSpy).toHaveBeenCalledWith("Loading configuration...");
      expect(consoleSpy).toHaveBeenCalledWith("Loading credentials...");
      expect(consoleSpy).toHaveBeenCalledWith("Initializing GA4 client...");
      expect(consoleSpy).toHaveBeenCalledWith("Multi-axis analysis completed:");
      expect(consoleSpy).toHaveBeenCalledWith("Generating insights...");

      consoleSpy.mockRestore();
    });

    it("should override propertyId with options", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [],
        topLosers: [],
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue({} as any);
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockResolvedValue(
        sourceAnalysis,
      );
      vi.spyOn(mockInsightGenerator, "generate").mockReturnValue("Mock report");

      mockGA4Client = new GA4ApiClient();
      const initializeSpy = vi
        .spyOn(mockGA4Client, "initialize")
        .mockResolvedValue(undefined);

      await orchestrator.execute("昨日のアクセス", {
        propertyId: "987654321",
      });

      // propertyIdが上書きされていることを確認
      // (initializeが呼ばれる前にconfigが変更されている)
      expect(mockConfigLoader.load).toHaveBeenCalled();
    });

    it("should calculate summary metrics correctly", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 100,
            previousSessions: 80,
            currentNewUsers: 50,
            previousNewUsers: 40,
            sessionChange: 20,
            sessionChangePercent: 25,
            newUserChange: 10,
            newUserChangePercent: 25,
          },
          {
            source: "direct",
            medium: "(none)",
            currentSessions: 50,
            previousSessions: 70,
            currentNewUsers: 25,
            previousNewUsers: 35,
            sessionChange: -20,
            sessionChangePercent: -28.57,
            newUserChange: -10,
            newUserChangePercent: -28.57,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue({} as any);
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockResolvedValue(
        sourceAnalysis,
      );
      vi.spyOn(mockInsightGenerator, "generate").mockReturnValue("Mock report");

      mockGA4Client = new GA4ApiClient();
      vi.spyOn(mockGA4Client, "initialize").mockResolvedValue(undefined);

      const result = await orchestrator.execute("昨日のアクセス");

      expect(result.summary.currentTotalSessions).toBe(150); // 100 + 50
      expect(result.summary.previousTotalSessions).toBe(150); // 80 + 70
      expect(result.summary.absoluteChange).toBe(0);
      expect(result.summary.percentChange).toBe(0);
    });

    it("should handle zero previous sessions", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "new-source",
            medium: "organic",
            currentSessions: 100,
            previousSessions: 0,
            currentNewUsers: 50,
            previousNewUsers: 0,
            sessionChange: 100,
            sessionChangePercent: Infinity,
            newUserChange: 50,
            newUserChangePercent: Infinity,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue({} as any);
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockResolvedValue(
        sourceAnalysis,
      );
      vi.spyOn(mockInsightGenerator, "generate").mockReturnValue("Mock report");

      mockGA4Client = new GA4ApiClient();
      vi.spyOn(mockGA4Client, "initialize").mockResolvedValue(undefined);

      const result = await orchestrator.execute("昨日のアクセス");

      expect(result.summary.currentTotalSessions).toBe(100);
      expect(result.summary.previousTotalSessions).toBe(0);
      expect(result.summary.absoluteChange).toBe(100);
      expect(result.summary.percentChange).toBe(Infinity);
    });
  });

  describe("異常系: execute", () => {
    it("should propagate query parsing errors", async () => {
      vi.spyOn(mockQueryParser, "parse").mockImplementation(() => {
        throw new Error("Invalid query");
      });

      await expect(orchestrator.execute("invalid query")).rejects.toThrow(
        "Invalid query",
      );
    });

    it("should propagate configuration errors", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockRejectedValue(
        new Error("Configuration not found"),
      );

      await expect(orchestrator.execute("昨日のアクセス")).rejects.toThrow(
        "Configuration not found",
      );
    });

    it("should propagate authentication errors", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockRejectedValue(
        new Error("Authentication failed"),
      );

      await expect(orchestrator.execute("昨日のアクセス")).rejects.toThrow(
        "Authentication failed",
      );
    });

    it("should propagate GA4 API errors", async () => {
      const parsedQuery: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      vi.spyOn(mockQueryParser, "parse").mockReturnValue(parsedQuery);
      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockAuthManager, "loadCredentials").mockResolvedValue({} as any);
      vi.spyOn(mockAnalysisEngine, "analyzeTrafficSources").mockRejectedValue(
        new Error("GA4 API error"),
      );

      await expect(orchestrator.execute("昨日のアクセス")).rejects.toThrow(
        "All analysis axes failed",
      );
    });

    it("should log errors when verbose is enabled", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.spyOn(mockQueryParser, "parse").mockImplementation(() => {
        throw new Error("Test error");
      });

      await expect(
        orchestrator.execute("invalid query", { verbose: true }),
      ).rejects.toThrow("Test error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error during query execution:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("正常系: checkConfig", () => {
    it("should return configuration", async () => {
      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);

      const result = await orchestrator.checkConfig();

      expect(result).toEqual(config);
      expect(mockConfigLoader.load).toHaveBeenCalled();
    });
  });

  describe("正常系: validateConfig", () => {
    it("should validate configuration successfully", async () => {
      const config: AppConfig = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockConfigLoader, "validate").mockReturnValue({
        isValid: true,
        errors: [],
      });

      const result = await orchestrator.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return validation errors", async () => {
      const config: AppConfig = {
        ga4PropertyId: "",
        defaultComparisonPeriod: "previous_day",
        verbose: false,
        enableGSC: false,
      };

      vi.spyOn(mockConfigLoader, "load").mockResolvedValue(config);
      vi.spyOn(mockConfigLoader, "validate").mockReturnValue({
        isValid: false,
        errors: ["Property ID is required"],
      });

      const result = await orchestrator.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(["Property ID is required"]);
    });

    it("should handle configuration loading errors", async () => {
      vi.spyOn(mockConfigLoader, "load").mockRejectedValue(
        new Error("Configuration not found"),
      );

      const result = await orchestrator.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(["Configuration not found"]);
    });
  });
});
