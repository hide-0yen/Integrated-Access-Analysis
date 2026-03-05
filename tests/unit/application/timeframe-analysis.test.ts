import { describe, it, expect, vi, beforeEach } from "vitest";
import { TimeframeAnalysis } from "@/application/timeframe-analysis";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import type { ParsedExploratoryQuery } from "@/domain/types/exploratory-query";
import type { GA4ReportResponse } from "@/types/models";

// GA4ApiClientをモック化
vi.mock("@/infrastructure/ga4-client");

describe("TimeframeAnalysis", () => {
  let analysis: TimeframeAnalysis;
  let mockGA4Client: GA4ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGA4Client = new GA4ApiClient({
      propertyId: "123456789",
    });
    analysis = new TimeframeAnalysis(mockGA4Client, "123456789");
  });

  describe("正常系 - データ取得と統計算出", () => {
    it("relative_rangeクエリでデータを正しく取得・統計算出できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-07",
          expression: "過去7日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "100" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "120" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "80" }],
          },
          {
            dimensionValues: [{ value: "20240104" }],
            metricValues: [{ value: "150" }],
          },
          {
            dimensionValues: [{ value: "20240105" }],
            metricValues: [{ value: "110" }],
          },
          {
            dimensionValues: [{ value: "20240106" }],
            metricValues: [{ value: "90" }],
          },
          {
            dimensionValues: [{ value: "20240107" }],
            metricValues: [{ value: "130" }],
          },
        ],
        rowCount: 7,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries).toHaveLength(7);
      expect(result.timeSeries[0].date).toBe("2024-01-01");
      expect(result.timeSeries[0].value).toBe(100);
      expect(result.statistics.count).toBe(7);
      expect(result.statistics.mean).toBeCloseTo(111.43, 1);
      expect(result.totalValue).toBe(780);
    });

    it("absolute_rangeクエリでデータを正しく取得できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "absolute_range",
          startDate: "2024-06-01",
          endDate: "2024-06-03",
          expression: "2024年6月1日から3日",
        },
        filters: [],
        metrics: ["activeUsers"],
        detection: { type: "decline", basis: "day_over_day" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240601" }],
            metricValues: [{ value: "50" }],
          },
          {
            dimensionValues: [{ value: "20240602" }],
            metricValues: [{ value: "45" }],
          },
          {
            dimensionValues: [{ value: "20240603" }],
            metricValues: [{ value: "40" }],
          },
        ],
        rowCount: 3,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries).toHaveLength(3);
      expect(result.timeSeries[0].date).toBe("2024-06-01");
      expect(result.timeSeries[1].value).toBe(45);
      expect(result.totalValue).toBe(135);
    });

    it("relative_pointクエリで単一日データを取得できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_point",
          targetDate: "2024-12-25",
          expression: "昨日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20241225" }],
            metricValues: [{ value: "200" }],
          },
        ],
        rowCount: 1,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries).toHaveLength(1);
      expect(result.timeSeries[0].date).toBe("2024-12-25");
      expect(result.timeSeries[0].value).toBe(200);
      expect(result.totalValue).toBe(200);
    });
  });

  describe("正常系 - 統計計算", () => {
    it("平均値を正しく算出できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-05",
          expression: "過去5日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "10" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "20" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "30" }],
          },
          {
            dimensionValues: [{ value: "20240104" }],
            metricValues: [{ value: "40" }],
          },
          {
            dimensionValues: [{ value: "20240105" }],
            metricValues: [{ value: "50" }],
          },
        ],
        rowCount: 5,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.statistics.mean).toBe(30);
      expect(result.statistics.count).toBe(5);
    });

    it("標準偏差を正しく算出できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-03",
          expression: "過去3日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "anomaly", basis: "statistical" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "10" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "20" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "30" }],
          },
        ],
        rowCount: 3,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.statistics.stdDev).toBeGreaterThan(0);
      expect(result.statistics.stdDev).toBeCloseTo(8.16, 1);
    });

    it("最小値・最大値を正しく算出できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-04",
          expression: "過去4日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "5" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "100" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "50" }],
          },
          {
            dimensionValues: [{ value: "20240104" }],
            metricValues: [{ value: "25" }],
          },
        ],
        rowCount: 4,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.statistics.min).toBe(5);
      expect(result.statistics.max).toBe(100);
    });

    it("中央値を正しく算出できる（偶数個）", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-04",
          expression: "過去4日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "10" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "20" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "30" }],
          },
          {
            dimensionValues: [{ value: "20240104" }],
            metricValues: [{ value: "40" }],
          },
        ],
        rowCount: 4,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.statistics.median).toBe(25); // (20 + 30) / 2
    });

    it("中央値を正しく算出できる（奇数個）", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-03",
          expression: "過去3日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "10" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "20" }],
          },
          {
            dimensionValues: [{ value: "20240103" }],
            metricValues: [{ value: "30" }],
          },
        ],
        rowCount: 3,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.statistics.median).toBe(20);
    });
  });

  describe("エッジケース", () => {
    it("データが0件の場合、統計情報は全て0になる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-01",
          expression: "今日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [],
        rowCount: 0,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries).toHaveLength(0);
      expect(result.statistics.mean).toBe(0);
      expect(result.statistics.stdDev).toBe(0);
      expect(result.statistics.min).toBe(0);
      expect(result.statistics.max).toBe(0);
      expect(result.statistics.median).toBe(0);
      expect(result.statistics.count).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it("フィルター付きクエリを処理できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-01-01",
          endDate: "2024-01-02",
          expression: "過去2日",
        },
        filters: [
          {
            dimension: "pagePath",
            operator: "contains",
            value: "/leasing/",
          },
        ],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20240101" }],
            metricValues: [{ value: "30" }],
          },
          {
            dimensionValues: [{ value: "20240102" }],
            metricValues: [{ value: "35" }],
          },
        ],
        rowCount: 2,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries).toHaveLength(2);
      expect(result.totalValue).toBe(65);
    });
  });

  describe("GA4日付フォーマット変換", () => {
    it("GA4形式(YYYYMMDD)をYYYY-MM-DD形式に変換できる", async () => {
      const query: ParsedExploratoryQuery = {
        analysisMode: "exploratory",
        timeframe: {
          type: "relative_range",
          startDate: "2024-11-15",
          endDate: "2024-11-15",
          expression: "今日",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
        needsConfirmation: false,
        confirmationPrompts: [],
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [{ name: "date" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [
          {
            dimensionValues: [{ value: "20241115" }],
            metricValues: [{ value: "100" }],
          },
        ],
        rowCount: 1,
      };

      vi.spyOn(mockGA4Client, "runReport").mockResolvedValue(mockResponse);

      const result = await analysis.analyze(query);

      expect(result.timeSeries[0].date).toBe("2024-11-15");
    });
  });
});
