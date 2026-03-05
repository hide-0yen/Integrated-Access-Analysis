import { describe, it, expect, beforeEach } from "vitest";
import { OutputFormatter } from "@/presentation/output-formatter";
import type { IntegratedAnalysisResult } from "@/application/insight-generator";
import type { ParsedQuery } from "@/types/models";
import {
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
  GA4AnalyzerError,
} from "@/types/errors";

describe("OutputFormatter", () => {
  let formatter: OutputFormatter;

  beforeEach(() => {
    formatter = new OutputFormatter();
  });

  describe("正常系: formatReport", () => {
    it("should format report from insights", () => {
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: ["Mock report content"],
      };

      const output = formatter.formatReport(result);

      expect(output).toBe("Mock report content");
    });

    it("should handle empty insights", () => {
      const result: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03"),
          comparisonDate: new Date("2026-03-02"),
          analysisType: "overview",
          comparisonType: "previous_day",
        } as ParsedQuery,
        summary: {
          currentTotalSessions: 0,
          previousTotalSessions: 0,
          absoluteChange: 0,
          percentChange: 0,
        },
        sourceAnalysis: null,
        insights: [],
      };

      const output = formatter.formatReport(result);

      expect(output).toBe("レポートが生成されませんでした。");
    });

    it("should handle multi-line insights", () => {
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: ["Line 1\nLine 2\nLine 3"],
      };

      const output = formatter.formatReport(result);

      expect(output).toContain("Line 1");
      expect(output).toContain("Line 2");
      expect(output).toContain("Line 3");
    });
  });

  describe("正常系: formatJSON", () => {
    it("should format result as JSON", () => {
      const result: IntegratedAnalysisResult = {
        query: {
          targetDate: new Date("2026-03-03T00:00:00.000Z"),
          comparisonDate: new Date("2026-03-02T00:00:00.000Z"),
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

      const output = formatter.formatJSON(result);
      const parsed = JSON.parse(output);

      expect(parsed.query.targetDate).toBe("2026-03-03T00:00:00.000Z");
      expect(parsed.query.comparisonDate).toBe("2026-03-02T00:00:00.000Z");
      expect(parsed.query.analysisType).toBe("overview");
      expect(parsed.query.comparisonType).toBe("previous_day");
      expect(parsed.summary.currentTotalSessions).toBe(1000);
      expect(parsed.summary.previousTotalSessions).toBe(900);
      expect(parsed.summary.absoluteChange).toBe(100);
      expect(parsed.summary.percentChange).toBe(11.1);
      expect(parsed.insights).toEqual(["Mock report"]);
    });

    it("should produce valid JSON format", () => {
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: [],
      };

      const output = formatter.formatJSON(result);

      // JSON.parseが成功すればvalidなJSON
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("should format JSON with proper indentation", () => {
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: [],
      };

      const output = formatter.formatJSON(result);

      // インデントがあることを確認
      expect(output).toContain("  ");
      expect(output).toContain("\n");
    });
  });

  describe("正常系: formatError - ConfigurationError", () => {
    it("should format configuration error", () => {
      const error = new ConfigurationError("設定ファイルが見つかりません");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ 設定エラー");
      expect(output).toContain("設定ファイルが見つかりません");
      expect(output).toContain("解決方法");
      expect(output).toContain("GA4_PROPERTY_ID");
      expect(output).toContain(".ga4rc.json");
    });

    it("should include error details when available", () => {
      const causeError = new Error("File not found");
      const error = new ConfigurationError("設定エラー", causeError);

      const output = formatter.formatError(error);

      expect(output).toContain("File not found");
    });
  });

  describe("正常系: formatError - AuthenticationError", () => {
    it("should format authentication error", () => {
      const error = new AuthenticationError("認証に失敗しました");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ 認証エラー");
      expect(output).toContain("認証に失敗しました");
      expect(output).toContain("考えられる原因");
      expect(output).toContain("サービスアカウント");
      expect(output).toContain("閲覧者権限");
    });
  });

  describe("正常系: formatError - QuotaExceededError", () => {
    it("should format quota exceeded error", () => {
      const error = new QuotaExceededError();

      const output = formatter.formatError(error);

      expect(output).toContain("❌ APIクォータ超過");
      expect(output).toContain("クォータ");
      expect(output).toContain("25,000");
      expect(output).toContain("5,000");
    });
  });

  describe("正常系: formatError - NetworkError", () => {
    it("should format network error", () => {
      const error = new NetworkError("接続がタイムアウトしました");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ ネットワークエラー");
      expect(output).toContain("接続がタイムアウトしました");
      expect(output).toContain("インターネット接続");
      expect(output).toContain("ファイアウォール");
    });
  });

  describe("正常系: formatError - ParseError", () => {
    it("should format parse error", () => {
      const error = new ParseError("日付を解析できませんでした");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ クエリ解析エラー");
      expect(output).toContain("日付を解析できませんでした");
      expect(output).toContain("使用可能な日付形式");
      expect(output).toContain("昨日");
      expect(output).toContain("2026-03-03");
    });
  });

  describe("正常系: formatError - ApiError", () => {
    it("should format API error", () => {
      const error = new ApiError("APIリクエストが失敗しました");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ APIエラー");
      expect(output).toContain("APIリクエストが失敗しました");
      expect(output).toContain("GA4 API");
      expect(output).toContain("プロパティID");
    });
  });

  describe("正常系: formatError - GA4AnalyzerError", () => {
    it("should format GA4Analyzer error", () => {
      const error = new GA4AnalyzerError("一般的なエラー");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ エラー");
      expect(output).toContain("一般的なエラー");
    });
  });

  describe("正常系: formatError - Generic Error", () => {
    it("should format generic error", () => {
      const error = new Error("予期しないエラー");

      const output = formatter.formatError(error);

      expect(output).toContain("❌ 予期しないエラーが発生しました");
      expect(output).toContain("予期しないエラー");
      expect(output).toContain("--check-config");
    });

    it("should include stack trace when available", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.ts:1:1";

      const output = formatter.formatError(error);

      expect(output).toContain("test.ts:1:1");
    });
  });

  describe("境界値テスト", () => {
    it("should handle very long insight text", () => {
      const longText = "A".repeat(10000);
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: [longText],
      };

      const output = formatter.formatReport(result);

      expect(output).toBe(longText);
      expect(output.length).toBe(10000);
    });

    it("should handle special characters in JSON", () => {
      const result: IntegratedAnalysisResult = {
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
        sourceAnalysis: null,
        insights: ['Test with "quotes" and \n newlines'],
      };

      const output = formatter.formatJSON(result);
      const parsed = JSON.parse(output);

      expect(parsed.insights[0]).toBe('Test with "quotes" and \n newlines');
    });
  });
});
