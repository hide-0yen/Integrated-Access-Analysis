import { describe, it, expect, beforeEach, vi } from "vitest";
import { CLIHandler } from "@/presentation/cli-handler";
import type { IntegratedAnalysisResult } from "@/application/insight-generator";
import type { ParsedQuery, AppConfig } from "@/types/models";
import {
  ConfigurationError,
  AuthenticationError,
  NetworkError,
} from "@/types/errors";

// モック用の共有オブジェクト
const mockExecute = vi.fn();
const mockCheckConfig = vi.fn();
const mockValidateConfig = vi.fn();
const mockFormatReport = vi.fn();
const mockFormatJSON = vi.fn();
const mockFormatError = vi.fn();

// QueryOrchestratorをモック
vi.mock("@/application/query-orchestrator", () => ({
  QueryOrchestrator: vi.fn(function (this: {
    execute: typeof mockExecute;
    checkConfig: typeof mockCheckConfig;
    validateConfig: typeof mockValidateConfig;
  }) {
    this.execute = mockExecute;
    this.checkConfig = mockCheckConfig;
    this.validateConfig = mockValidateConfig;
  }),
}));

// OutputFormatterをモック
vi.mock("@/presentation/output-formatter", () => ({
  OutputFormatter: vi.fn(function (this: {
    formatReport: typeof mockFormatReport;
    formatJSON: typeof mockFormatJSON;
    formatError: typeof mockFormatError;
  }) {
    this.formatReport = mockFormatReport;
    this.formatJSON = mockFormatJSON;
    this.formatError = mockFormatError;
  }),
}));

describe("CLIHandler", () => {
  let handler: CLIHandler;

  // console.logとconsole.errorをモック
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // CLIHandlerを作成
    handler = new CLIHandler();

    // console.logとconsole.errorをスパイ
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("正常系: run", () => {
    it("CLI-N001: should execute basic query", async () => {
      const mockResult: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-03-02"),
          analysisType: "overview",
          comparisonType: "previous_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 1000,
          previousTotalSessions: 900,
          absoluteChange: 100,
          percentChange: 11.1,
        },
        sourceAnalysis: {
          sources: [],
          topGainers: [],
          topLosers: [],
        },
        insights: ["Mock report"],
      };

      mockExecute.mockResolvedValue(mockResult);
      mockFormatReport.mockReturnValue("Formatted Report");

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "昨日のアクセス増の要因",
      ]);

      expect(exitCode).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith("昨日のアクセス増の要因", {
        verbose: undefined,
        compareType: undefined,
        propertyId: undefined,
      });
      expect(mockFormatReport).toHaveBeenCalledWith(mockResult);
      expect(consoleLogSpy).toHaveBeenCalledWith("Formatted Report");
    });

    it("CLI-N002: should handle --verbose option", async () => {
      const mockResult: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-03-02"),
          analysisType: "overview",
          comparisonType: "previous_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 1000,
          previousTotalSessions: 900,
          absoluteChange: 100,
          percentChange: 11.1,
        },
        sourceAnalysis: {
          sources: [],
          topGainers: [],
          topLosers: [],
        },
        insights: ["Mock report"],
      };

      mockExecute.mockResolvedValue(mockResult);
      mockFormatReport.mockReturnValue("Formatted Report");

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "昨日のアクセス",
        "--verbose",
      ]);

      expect(exitCode).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith("昨日のアクセス", {
        verbose: true,
        compareType: undefined,
        propertyId: undefined,
      });
    });

    it("CLI-N003: should handle --check-config option", async () => {
      const mockConfig: AppConfig = {
        ga4PropertyId: "123456789",
        serviceAccountKeyPath: "/path/to/key.json",
        defaultComparisonPeriod: "previous_day",
      };

      mockCheckConfig.mockResolvedValue(mockConfig);

      const exitCode = await handler.run(["node", "cli.js", "--check-config"]);

      expect(exitCode).toBe(0);
      expect(mockCheckConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "✅ 設定が正常に読み込まれました\n",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "GA4 Property ID:",
        "123456789",
      );
    });

    it("CLI-N004: should handle --json option", async () => {
      const mockResult: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-03-02"),
          analysisType: "overview",
          comparisonType: "previous_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 1000,
          previousTotalSessions: 900,
          absoluteChange: 100,
          percentChange: 11.1,
        },
        sourceAnalysis: {
          sources: [],
          topGainers: [],
          topLosers: [],
        },
        insights: ["Mock report"],
      };

      mockExecute.mockResolvedValue(mockResult);
      mockFormatJSON.mockReturnValue('{"mock": "json"}');

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "昨日のアクセス",
        "--json",
      ]);

      expect(exitCode).toBe(0);
      expect(mockFormatJSON).toHaveBeenCalledWith(mockResult);
      expect(consoleLogSpy).toHaveBeenCalledWith('{"mock": "json"}');
    });

    it("CLI-N007: should handle --compare option", async () => {
      const mockResult: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-02-24"),
          analysisType: "overview",
          comparisonType: "previous_week_same_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 1000,
          previousTotalSessions: 900,
          absoluteChange: 100,
          percentChange: 11.1,
        },
        sourceAnalysis: {
          sources: [],
          topGainers: [],
          topLosers: [],
        },
        insights: ["Mock report"],
      };

      mockExecute.mockResolvedValue(mockResult);
      mockFormatReport.mockReturnValue("Formatted Report");

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "3/3のアクセス",
        "--compare",
        "前週同日",
      ]);

      expect(exitCode).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith("3/3のアクセス", {
        verbose: undefined,
        compareType: "前週同日",
        propertyId: undefined,
      });
    });

    it("should handle --validate-config option with valid config", async () => {
      mockValidateConfig.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "--validate-config",
      ]);

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("✅ 設定は有効です");
    });

    it("should handle --validate-config option with invalid config", async () => {
      mockValidateConfig.mockResolvedValue({
        isValid: false,
        errors: ["Error 1", "Error 2"],
      });

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "--validate-config",
      ]);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("❌ 設定に問題があります\n");
      expect(consoleErrorSpy).toHaveBeenCalledWith("  - Error 1");
      expect(consoleErrorSpy).toHaveBeenCalledWith("  - Error 2");
    });

    it("should handle --property-id option", async () => {
      const mockResult: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-03-02"),
          analysisType: "overview",
          comparisonType: "previous_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 1000,
          previousTotalSessions: 900,
          absoluteChange: 100,
          percentChange: 11.1,
        },
        sourceAnalysis: {
          sources: [],
          topGainers: [],
          topLosers: [],
        },
        insights: ["Mock report"],
      };

      mockExecute.mockResolvedValue(mockResult);
      mockFormatReport.mockReturnValue("Formatted Report");

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "昨日のアクセス",
        "--property-id",
        "987654321",
      ]);

      expect(exitCode).toBe(0);
      expect(mockExecute).toHaveBeenCalledWith("昨日のアクセス", {
        verbose: undefined,
        compareType: undefined,
        propertyId: "987654321",
      });
    });
  });

  describe("異常系: run", () => {
    it("CLI-E001: should show help when no query is provided", async () => {
      const helpSpy = vi
        .spyOn(handler["program"], "help")
        .mockImplementation(() => {
          return undefined as never;
        });

      const exitCode = await handler.run(["node", "cli.js"]);

      expect(exitCode).toBe(2);
      expect(helpSpy).toHaveBeenCalled();
    });

    it("CLI-E003: should handle configuration error", async () => {
      const error = new ConfigurationError("設定ファイルが見つかりません");
      mockExecute.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run(["node", "cli.js", "昨日のアクセス"]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("CLI-E004: should handle authentication error", async () => {
      const error = new AuthenticationError("認証に失敗しました");
      mockExecute.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run(["node", "cli.js", "昨日のアクセス"]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("CLI-E005: should handle network error", async () => {
      const error = new NetworkError("接続がタイムアウトしました");
      mockExecute.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run(["node", "cli.js", "昨日のアクセス"]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("should handle generic error", async () => {
      const error = new Error("Generic error");
      mockExecute.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run(["node", "cli.js", "昨日のアクセス"]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("should handle --check-config error", async () => {
      const error = new ConfigurationError("設定ファイルが見つかりません");
      mockCheckConfig.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run(["node", "cli.js", "--check-config"]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("should handle --validate-config error", async () => {
      const error = new ConfigurationError("設定ファイルが見つかりません");
      mockValidateConfig.mockRejectedValue(error);
      mockFormatError.mockReturnValue("Formatted Error");

      const exitCode = await handler.run([
        "node",
        "cli.js",
        "--validate-config",
      ]);

      expect(exitCode).toBe(1);
      expect(mockFormatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Formatted Error");
    });

    it("should handle non-Error exceptions", async () => {
      mockExecute.mockRejectedValue("String error");

      const exitCode = await handler.run(["node", "cli.js", "昨日のアクセス"]);

      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ 予期しないエラーが発生しました",
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith("String error");
    });
  });
});
