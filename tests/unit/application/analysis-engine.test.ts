import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalysisEngine } from "@/application/analysis-engine";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import type { ParsedQuery, GA4ReportResponse } from "@/types/models";

describe("AnalysisEngine", () => {
  let engine: AnalysisEngine;
  let mockClient: GA4ApiClient;

  beforeEach(() => {
    engine = new AnalysisEngine();
    mockClient = new GA4ApiClient();
  });

  describe("正常系: analyzeTrafficSources", () => {
    it("should analyze traffic sources with comparison", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [
              { value: "150" }, // current sessions
              { value: "80" }, // current newUsers
            ],
          },
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [
              { value: "100" }, // previous sessions
              { value: "50" }, // previous newUsers
            ],
          },
          {
            dimensionValues: [
              { value: "direct" },
              { value: "(none)" },
              { value: "date_range_0" },
            ],
            metricValues: [
              { value: "80" }, // current sessions
              { value: "40" }, // current newUsers
            ],
          },
          {
            dimensionValues: [
              { value: "direct" },
              { value: "(none)" },
              { value: "date_range_1" },
            ],
            metricValues: [
              { value: "100" }, // previous sessions
              { value: "50" }, // previous newUsers
            ],
          },
        ],
        rowCount: 4,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].source).toBe("google");
      expect(result.sources[0].medium).toBe("organic");
      expect(result.sources[0].currentSessions).toBe(150);
      expect(result.sources[0].previousSessions).toBe(100);
      expect(result.sources[0].sessionChange).toBe(50);
      expect(result.sources[0].sessionChangePercent).toBe(50);
    });

    it("should identify top gainers correctly", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "increase_factors",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "150" }, { value: "80" }],
          },
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "facebook" },
              { value: "social" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "200" }, { value: "100" }],
          },
          {
            dimensionValues: [
              { value: "facebook" },
              { value: "social" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "twitter" },
              { value: "social" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "110" }, { value: "60" }],
          },
          {
            dimensionValues: [
              { value: "twitter" },
              { value: "social" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
        ],
        rowCount: 6,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.topGainers).toHaveLength(3);
      expect(result.topGainers[0].source).toBe("facebook");
      expect(result.topGainers[0].sessionChangePercent).toBe(100);
      expect(result.topGainers[1].source).toBe("google");
      expect(result.topGainers[1].sessionChangePercent).toBe(50);
    });

    it("should identify top losers correctly", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "decrease_factors",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "direct" },
              { value: "(none)" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "50" }, { value: "30" }],
          },
          {
            dimensionValues: [
              { value: "direct" },
              { value: "(none)" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "email" },
              { value: "email" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "80" }, { value: "40" }],
          },
          {
            dimensionValues: [
              { value: "email" },
              { value: "email" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "referral" },
              { value: "referral" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "70" }, { value: "35" }],
          },
          {
            dimensionValues: [
              { value: "referral" },
              { value: "referral" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
        ],
        rowCount: 6,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.topLosers).toHaveLength(3);
      expect(result.topLosers[0].source).toBe("direct");
      expect(result.topLosers[0].sessionChangePercent).toBe(-50);
      expect(result.topLosers[1].source).toBe("referral");
      expect(result.topLosers[1].sessionChangePercent).toBe(-30);
    });

    it("should handle zero previous sessions correctly", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "new-source" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "100" }, { value: "80" }],
          },
          {
            dimensionValues: [
              { value: "new-source" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "0" }, { value: "0" }],
          },
        ],
        rowCount: 2,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].currentSessions).toBe(100);
      expect(result.sources[0].previousSessions).toBe(0);
      expect(result.sources[0].sessionChangePercent).toBe(Infinity);
    });

    it("should handle no change correctly", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
        ],
        rowCount: 2,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources[0].sessionChange).toBe(0);
      expect(result.sources[0].sessionChangePercent).toBe(0);
      expect(result.topGainers).toHaveLength(0);
      expect(result.topLosers).toHaveLength(0);
    });

    it("should limit top gainers/losers to 3", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "source1" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "200" }, { value: "100" }],
          },
          {
            dimensionValues: [
              { value: "source1" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "source2" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "180" }, { value: "90" }],
          },
          {
            dimensionValues: [
              { value: "source2" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "source3" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "160" }, { value: "80" }],
          },
          {
            dimensionValues: [
              { value: "source3" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "source4" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "140" }, { value: "70" }],
          },
          {
            dimensionValues: [
              { value: "source4" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
          {
            dimensionValues: [
              { value: "source5" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "120" }, { value: "60" }],
          },
          {
            dimensionValues: [
              { value: "source5" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "100" }, { value: "50" }],
          },
        ],
        rowCount: 10,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources).toHaveLength(5);
      expect(result.topGainers).toHaveLength(3);
      expect(result.topGainers[0].source).toBe("source1");
      expect(result.topGainers[1].source).toBe("source2");
      expect(result.topGainers[2].source).toBe("source3");
    });

    it("should handle empty response", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [],
        rowCount: 0,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources).toHaveLength(0);
      expect(result.topGainers).toHaveLength(0);
      expect(result.topLosers).toHaveLength(0);
    });

    it("should calculate newUser metrics correctly", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [
              { value: "150" },
              { value: "90" }, // current newUsers
            ],
          },
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [
              { value: "100" },
              { value: "60" }, // previous newUsers
            ],
          },
        ],
        rowCount: 2,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources[0].currentNewUsers).toBe(90);
      expect(result.sources[0].previousNewUsers).toBe(60);
      expect(result.sources[0].newUserChange).toBe(30);
      expect(result.sources[0].newUserChangePercent).toBe(50);
    });
  });

  describe("境界値テスト", () => {
    it("should handle very large session numbers", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      const mockResponse: GA4ReportResponse = {
        dimensionHeaders: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "dateRange" },
        ],
        metricHeaders: [
          { name: "sessions", type: "TYPE_INTEGER" },
          { name: "newUsers", type: "TYPE_INTEGER" },
        ],
        rows: [
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_0" },
            ],
            metricValues: [{ value: "1000000" }, { value: "500000" }],
          },
          {
            dimensionValues: [
              { value: "google" },
              { value: "organic" },
              { value: "date_range_1" },
            ],
            metricValues: [{ value: "999999" }, { value: "500000" }],
          },
        ],
        rowCount: 2,
      };

      vi.spyOn(mockClient, "runReport").mockResolvedValue(mockResponse);

      const result = await engine.analyzeTrafficSources(query, mockClient);

      expect(result.sources[0].currentSessions).toBe(1000000);
      expect(result.sources[0].previousSessions).toBe(999999);
      expect(result.sources[0].sessionChange).toBe(1);
    });
  });

  describe("エラーケース", () => {
    it("should propagate GA4 API errors", async () => {
      const query: ParsedQuery = {
        targetDate: new Date("2026-03-03"),
        comparisonDate: new Date("2026-03-02"),
        analysisType: "overview",
        comparisonType: "previous_day",
      };

      vi.spyOn(mockClient, "runReport").mockRejectedValue(
        new Error("API Error"),
      );

      await expect(
        engine.analyzeTrafficSources(query, mockClient),
      ).rejects.toThrow("API Error");
    });
  });
});
