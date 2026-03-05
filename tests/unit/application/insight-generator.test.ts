import { describe, it, expect, beforeEach } from "vitest";
import {
  InsightGenerator,
  type IntegratedAnalysisResult,
  type SummaryMetrics,
} from "@/application/insight-generator";
import type { SourceAnalysisResult } from "@/application/analysis-engine";
import type { ParsedQuery } from "@/types/models";

describe("InsightGenerator", () => {
  let generator: InsightGenerator;

  beforeEach(() => {
    generator = new InsightGenerator();
  });

  describe("正常系: generate", () => {
    it("should generate report for access increase", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "increase_factors",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1200,
        previousTotalSessions: 1000,
        absoluteChange: 200,
        percentChange: 20,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 800,
            previousSessions: 600,
            currentNewUsers: 400,
            previousNewUsers: 300,
            sessionChange: 200,
            sessionChangePercent: 33.3,
            newUserChange: 100,
            newUserChangePercent: 33.3,
          },
        ],
        topGainers: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 800,
            previousSessions: 600,
            currentNewUsers: 400,
            previousNewUsers: 300,
            sessionChange: 200,
            sessionChangePercent: 33.3,
            newUserChange: 100,
            newUserChangePercent: 33.3,
          },
        ],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("【対象日: 2026-03-03 vs 比較日: 2026-03-02】");
      expect(report).toContain("総アクセス数: 1,200 セッション");
      expect(report).toContain("前日比 +20.0%");
      expect(report).toContain("+200 セッション");
      expect(report).toContain("【主な増加要因】");
      expect(report).toContain("google/organic");
    });

    it("should generate report for access decrease", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "decrease_factors",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 800,
        previousTotalSessions: 1000,
        absoluteChange: -200,
        percentChange: -20,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "direct",
            medium: "(none)",
            currentSessions: 400,
            previousSessions: 600,
            currentNewUsers: 200,
            previousNewUsers: 300,
            sessionChange: -200,
            sessionChangePercent: -33.3,
            newUserChange: -100,
            newUserChangePercent: -33.3,
          },
        ],
        topGainers: [],
        topLosers: [
          {
            source: "direct",
            medium: "(none)",
            currentSessions: 400,
            previousSessions: 600,
            currentNewUsers: 200,
            previousNewUsers: 300,
            sessionChange: -200,
            sessionChangePercent: -33.3,
            newUserChange: -100,
            newUserChangePercent: -33.3,
          },
        ],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("総アクセス数: 800 セッション");
      expect(report).toContain("前日比 -20.0%");
      expect(report).toContain("-200 セッション");
      expect(report).toContain("【主な減少要因】");
      expect(report).toContain("direct/(none)");
    });

    it("should generate report with no change", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1000,
        previousTotalSessions: 1000,
        absoluteChange: 0,
        percentChange: 0,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 1000,
            previousSessions: 1000,
            currentNewUsers: 500,
            previousNewUsers: 500,
            sessionChange: 0,
            sessionChangePercent: 0,
            newUserChange: 0,
            newUserChangePercent: 0,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("総アクセス数: 1,000 セッション");
      expect(report).toContain("+0.0%");
      expect(report).toContain("+0 セッション");
    });

    it("should identify key changes correctly", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1500,
        previousTotalSessions: 1000,
        absoluteChange: 500,
        percentChange: 50,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 900,
            previousSessions: 600,
            currentNewUsers: 450,
            previousNewUsers: 300,
            sessionChange: 300,
            sessionChangePercent: 50,
            newUserChange: 150,
            newUserChangePercent: 50,
          },
          {
            source: "facebook",
            medium: "social",
            currentSessions: 400,
            previousSessions: 300,
            currentNewUsers: 200,
            previousNewUsers: 150,
            sessionChange: 100,
            sessionChangePercent: 33.3,
            newUserChange: 50,
            newUserChangePercent: 33.3,
          },
        ],
        topLosers: [
          {
            source: "direct",
            medium: "(none)",
            currentSessions: 200,
            previousSessions: 300,
            currentNewUsers: 100,
            previousNewUsers: 150,
            sessionChange: -100,
            sessionChangePercent: -33.3,
            newUserChange: -50,
            newUserChangePercent: -33.3,
          },
        ],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const changes = generator.identifyKeyChanges(analysis);

      expect(changes).toHaveLength(3);
      expect(changes[0].item).toBe("google/organic");
      expect(changes[0].changePercent).toBe(50);
      expect(changes[1].item).toBe("facebook/social");
      expect(changes[2].item).toBe("direct/(none)");
    });

    it("should format numbers with commas", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1234567,
        previousTotalSessions: 1000000,
        absoluteChange: 234567,
        percentChange: 23.5,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 1234567,
            previousSessions: 1000000,
            currentNewUsers: 617284,
            previousNewUsers: 500000,
            sessionChange: 234567,
            sessionChangePercent: 23.5,
            newUserChange: 117284,
            newUserChangePercent: 23.5,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("1,234,567 セッション");
      expect(report).toContain("+234,567 セッション");
    });

    it("should generate hypotheses for search traffic increase", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "increase_factors",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1500,
        previousTotalSessions: 1000,
        absoluteChange: 500,
        percentChange: 50,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 900,
            previousSessions: 600,
            currentNewUsers: 450,
            previousNewUsers: 300,
            sessionChange: 300,
            sessionChangePercent: 50,
            newUserChange: 150,
            newUserChangePercent: 50,
          },
        ],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("【推察】");
      expect(report).toContain("検索エンジン経由のアクセスが増加");
      expect(report).toContain("SEO施策の効果");
    });

    it("should generate hypotheses for direct traffic decrease", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "decrease_factors",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 700,
        previousTotalSessions: 1000,
        absoluteChange: -300,
        percentChange: -30,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [],
        topLosers: [
          {
            source: "direct",
            medium: "(none)",
            currentSessions: 350,
            previousSessions: 500,
            currentNewUsers: 175,
            previousNewUsers: 250,
            sessionChange: -150,
            sessionChangePercent: -30,
            newUserChange: -75,
            newUserChangePercent: -30,
          },
        ],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("【推察】");
      expect(report).toContain("ダイレクト流入が減少");
      expect(report).toContain("ブックマークや直接URLアクセス");
    });

    it("should use correct comparison labels", () => {
      const baseQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview" as const,
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1000,
        previousTotalSessions: 900,
        absoluteChange: 100,
        percentChange: 11.1,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 1000,
            previousSessions: 900,
            currentNewUsers: 500,
            previousNewUsers: 450,
            sessionChange: 100,
            sessionChangePercent: 11.1,
            newUserChange: 50,
            newUserChangePercent: 11.1,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const testCases: Array<{ type: string; label: string }> = [
        { type: "previous_day", label: "前日比" },
        { type: "previous_week", label: "前週比" },
        { type: "previous_month", label: "前月比" },
      ];

      for (const testCase of testCases) {
        const query = { ...baseQuery, comparisonType: testCase.type };
        const analysis: IntegratedAnalysisResult = {
          query: query as ParsedQuery,
          summary,
          sourceAnalysis,
          insights: [],
        };

        const report = generator.generate(analysis);
        expect(report).toContain(testCase.label);
      }
    });
  });

  describe("異常系: generate", () => {
    it("should handle empty source analysis", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 0,
        previousTotalSessions: 0,
        absoluteChange: 0,
        percentChange: 0,
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis: null,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("データが取得できませんでした");
      expect(report).toContain("設定やAPI接続を確認してください");
    });

    it("should handle empty sources array", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 0,
        previousTotalSessions: 0,
        absoluteChange: 0,
        percentChange: 0,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("データが取得できませんでした");
    });

    it("should handle no significant changes", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1050,
        previousTotalSessions: 1000,
        absoluteChange: 50,
        percentChange: 5,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 1050,
            previousSessions: 1000,
            currentNewUsers: 525,
            previousNewUsers: 500,
            sessionChange: 50,
            sessionChangePercent: 5,
            newUserChange: 25,
            newUserChangePercent: 5,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("大きな変化は見られませんでした");
    });
  });

  describe("境界値テスト", () => {
    it("should handle infinity percent change", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 1000,
        previousTotalSessions: 0,
        absoluteChange: 1000,
        percentChange: Infinity,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 1000,
            previousSessions: 0,
            currentNewUsers: 500,
            previousNewUsers: 0,
            sessionChange: 1000,
            sessionChangePercent: Infinity,
            newUserChange: 500,
            newUserChangePercent: Infinity,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("∞%");
    });

    it("should handle very large numbers", () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const summary: SummaryMetrics = {
        currentTotalSessions: 10000000,
        previousTotalSessions: 9000000,
        absoluteChange: 1000000,
        percentChange: 11.1,
      };

      const sourceAnalysis: SourceAnalysisResult = {
        sources: [
          {
            source: "google",
            medium: "organic",
            currentSessions: 10000000,
            previousSessions: 9000000,
            currentNewUsers: 5000000,
            previousNewUsers: 4500000,
            sessionChange: 1000000,
            sessionChangePercent: 11.1,
            newUserChange: 500000,
            newUserChangePercent: 11.1,
          },
        ],
        topGainers: [],
        topLosers: [],
      };

      const analysis: IntegratedAnalysisResult = {
        query,
        summary,
        sourceAnalysis,
        insights: [],
      };

      const report = generator.generate(analysis);

      expect(report).toContain("10,000,000");
      expect(report).toContain("1,000,000");
    });
  });
});
