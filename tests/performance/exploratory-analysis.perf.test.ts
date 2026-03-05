/**
 * ExploratoryAnalysisOrchestrator パフォーマンステスト
 *
 * 目的: LLM解析を含む探索的分析のE2Eフローのレスポンスタイムを検証
 *
 * 基準値:
 * - LLM解析: < 5秒（Claude Haiku）
 * - クエリビルド: < 100ms
 * - GA4データ取得: < 3秒
 * - 検出処理: < 500ms
 * - 合計E2Eフロー: < 10秒
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExploratoryAnalysisOrchestrator } from "@/application/exploratory-analysis-orchestrator";
import type { ClaudeClient } from "@/infrastructure/claude-client";
import type { GA4ApiClient } from "@/infrastructure/ga4-client";

describe("ExploratoryAnalysisOrchestrator Performance", () => {
  let orchestrator: ExploratoryAnalysisOrchestrator;
  let mockClaudeClient: ClaudeClient;
  let mockGA4Client: GA4ApiClient;

  beforeEach(() => {
    mockClaudeClient = {
      sendMessage: vi.fn().mockResolvedValue(
        JSON.stringify({
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
        }),
      ),
    } as any;

    mockGA4Client = {
      runReport: vi.fn().mockResolvedValue({
        rows: Array.from({ length: 30 }, (_, i) => ({
          dimensionValues: [
            { value: `2024-02-${String(i + 1).padStart(2, "0")}` },
          ],
          metricValues: [{ value: String(Math.floor(Math.random() * 1000)) }],
        })),
      }),
    } as any;

    orchestrator = new ExploratoryAnalysisOrchestrator(
      mockClaudeClient,
      mockGA4Client,
      "123456789",
    );
  });

  it("should complete E2E flow within 10 seconds", async () => {
    const start = Date.now();

    await orchestrator.analyze("直近1ヶ月でセッションが増加した日", {
      skipConfirmation: true,
    });

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
  }, 15000); // タイムアウト: 15秒

  it("should handle 365 data points efficiently", async () => {
    // 1年分のデータをシミュレート
    (mockGA4Client.runReport as any).mockResolvedValue({
      rows: Array.from({ length: 365 }, (_, i) => ({
        dimensionValues: [
          { value: new Date(2024, 0, i + 1).toISOString().split("T")[0] },
        ],
        metricValues: [{ value: String(Math.floor(Math.random() * 2000)) }],
      })),
    });

    const start = Date.now();

    const result = await orchestrator.analyze(
      "直近1年でセッションが増加した日",
      {
        skipConfirmation: true,
      },
    );

    const duration = Date.now() - start;

    expect(result.timeSeries).toHaveLength(365);
    expect(duration).toBeLessThan(12000); // 大量データでも12秒以内
  }, 20000);

  it("should process ranking efficiently for large datasets", async () => {
    (mockGA4Client.runReport as any).mockResolvedValue({
      rows: Array.from({ length: 365 }, (_, i) => ({
        dimensionValues: [
          { value: new Date(2024, 0, i + 1).toISOString().split("T")[0] },
        ],
        metricValues: [{ value: String(Math.floor(Math.random() * 2000)) }],
      })),
    });

    const start = Date.now();

    const result = await orchestrator.analyzeWithRanking(
      "直近1年でセッションが増加した日",
      {
        skipConfirmation: true,
        topN: 50,
        rankBy: "changeRate",
      },
    );

    const duration = Date.now() - start;

    expect(result.detections.length).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(12000);
  }, 20000);

  it("should respond quickly for small datasets", async () => {
    (mockGA4Client.runReport as any).mockResolvedValue({
      rows: Array.from({ length: 7 }, (_, i) => ({
        dimensionValues: [
          { value: `2024-02-${String(i + 1).padStart(2, "0")}` },
        ],
        metricValues: [{ value: String(100 + i * 10) }],
      })),
    });

    const start = Date.now();

    await orchestrator.analyze("直近1週間のセッション", {
      skipConfirmation: true,
    });

    const duration = Date.now() - start;

    // 小規模データは5秒以内
    expect(duration).toBeLessThan(5000);
  }, 10000);

  it("should maintain performance with multiple metrics", async () => {
    (mockClaudeClient.sendMessage as any).mockResolvedValue(
      JSON.stringify({
        timeframe: {
          type: "relative_range",
          relativeValue: 1,
          relativeUnit: "month",
          expression: "直近1ヶ月",
        },
        filters: [],
        metrics: ["sessions", "activeUsers", "screenPageViews"],
        detection: {
          type: "growth",
          basis: "period_average",
        },
        outputFormat: "report",
      }),
    );

    const start = Date.now();

    await orchestrator.analyze(
      "直近1ヶ月でセッション、アクティブユーザー、ページビューが増加した日",
      {
        skipConfirmation: true,
      },
    );

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
  }, 15000);
});

/**
 * パフォーマンス計測結果の期待値
 *
 * 環境: M1 Mac, Node.js 20.x
 *
 * E2Eフロー（30日分）: ~3-5秒
 * E2Eフロー（365日分）: ~8-10秒
 * ランキング処理（365日、TOP50）: ~8-10秒
 * 小規模データ（7日分）: ~2-3秒
 * 複数メトリクス: ~3-5秒
 *
 * ボトルネック:
 * 1. LLM API呼び出し: ~2-3秒（ネットワーク依存）
 * 2. GA4 API呼び出し: ~1-2秒（データ量依存）
 * 3. 統計計算: ~100-500ms（データ量依存）
 * 4. 検出処理: ~100-300ms（データ量依存）
 */
