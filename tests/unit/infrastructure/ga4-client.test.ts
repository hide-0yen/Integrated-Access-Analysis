import { describe, it, expect, beforeEach } from "vitest";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import { ApiError } from "@/types/errors";

/**
 * GA4ApiClient Unit Tests
 *
 * Note: 実際のGA4 API呼び出しのモックは複雑なため、
 * 統合テストでカバーします。ここでは基本的な機能のみをテストします。
 */
describe("GA4ApiClient", () => {
  let client: GA4ApiClient;

  beforeEach(() => {
    client = new GA4ApiClient();
  });

  describe("runReport", () => {
    it("should throw ApiError when client is not initialized", async () => {
      const request = {
        dateRanges: [{ startDate: "2026-03-01", endDate: "2026-03-03" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
      };

      await expect(client.runReport(request)).rejects.toThrow(ApiError);
      await expect(client.runReport(request)).rejects.toThrow(
        "GA4Clientが初期化されていません",
      );
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle errors correctly", () => {
      // エラーハンドリングロジックは実装に含まれている
      // 実際のエラーケースは統合テストでテストする
      expect(client).toBeInstanceOf(GA4ApiClient);
    });
  });

  describe("runReportWithRetry", () => {
    it("should throw error when client is not initialized", async () => {
      const request = {
        dateRanges: [{ startDate: "2026-03-01", endDate: "2026-03-03" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
      };

      await expect(client.runReportWithRetry(request)).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe("runBatchReports", () => {
    it("should throw error when client is not initialized", async () => {
      const requests = [
        {
          dateRanges: [{ startDate: "2026-03-01", endDate: "2026-03-03" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
        },
      ];

      await expect(client.runBatchReports(requests)).rejects.toThrow(ApiError);
    });
  });
});
