/**
 * GA4ApiClient
 * GA4 Data API v1との通信を管理
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";
import {
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
} from "@/types/errors";
import { GA4Config, GA4ReportRequest, GA4ReportResponse } from "@/types/models";

/**
 * GA4ApiClientクラス
 */
export class GA4ApiClient {
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId: string = "";

  /**
   * クライアントを初期化する
   */
  async initialize(config: GA4Config): Promise<void> {
    try {
      if (config.serviceAccountKeyPath) {
        // サービスアカウントキーファイルから認証
        this.client = new BetaAnalyticsDataClient({
          keyFilename: config.serviceAccountKeyPath,
        });
      } else if (config.credentials) {
        // GoogleAuthインスタンスから認証
        const auth = config.credentials as GoogleAuth;
        this.client = new BetaAnalyticsDataClient({
          auth,
        });
      } else {
        // GOOGLE_APPLICATION_CREDENTIALS環境変数を使用
        this.client = new BetaAnalyticsDataClient();
      }

      this.propertyId = config.propertyId;

      // 認証テスト
      await this.testConnection();
    } catch (error) {
      throw new AuthenticationError("GA4認証に失敗しました", error);
    }
  }

  /**
   * レポートを実行する
   */
  async runReport(request: GA4ReportRequest): Promise<GA4ReportResponse> {
    if (!this.client) {
      throw new ApiError("GA4Clientが初期化されていません");
    }

    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: request.dateRanges,
        dimensions: request.dimensions,
        metrics: request.metrics,
        limit: request.limit ?? 10,
        offset: request.offset ?? 0,
        orderBys: request.orderBys ?? [],
      });

      // デバッグ: APIレスポンスの構造を確認
      if (
        process.env.GA4_VERBOSE === "true" ||
        process.env.GA4_VERBOSE === "1"
      ) {
        console.log("GA4 API Response:");
        console.log(`- Row count: ${String(response.rowCount ?? 0)}`);
        console.log(
          `- Dimension headers: ${JSON.stringify(response.dimensionHeaders)}`,
        );
        console.log(
          `- Metric headers: ${JSON.stringify(response.metricHeaders)}`,
        );
        if (response.rows && response.rows.length > 0) {
          console.log(
            `- First row sample: ${JSON.stringify(response.rows[0])}`,
          );
        }
      }

      return this.transformResponse(response);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * リトライ付きでレポートを実行する
   */
  async runReportWithRetry(
    request: GA4ReportRequest,
    maxRetries = 3,
  ): Promise<GA4ReportResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.runReport(request);
      } catch (error) {
        lastError = error as Error;

        // クォータ超過は即座に失敗
        if (error instanceof QuotaExceededError) {
          throw error;
        }

        // AuthenticationErrorも即座に失敗
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // NetworkErrorの場合は指数バックオフでリトライ
        if (error instanceof NetworkError && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1秒, 2秒, 4秒
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // その他のエラーは即座に失敗
        throw error;
      }
    }

    // lastErrorは必ず設定されている(ループが少なくとも1回実行されるため)
    if (!lastError) {
      throw new ApiError("予期しないエラー: リトライが実行されませんでした");
    }
    throw lastError;
  }

  /**
   * レスポンスを変換する
   */
  private transformResponse(response: unknown): GA4ReportResponse {
    // レスポンスの型を明示的に定義して変換
    const data = response as {
      dimensionHeaders?: Array<{ name?: string | null }>;
      metricHeaders?: Array<{ name?: string | null; type?: string | null }>;
      rows?: Array<{
        dimensionValues?: Array<{ value?: string | null }>;
        metricValues?: Array<{ value?: string | null }>;
      }>;
      rowCount?: number | null;
    };

    return {
      dimensionHeaders:
        data.dimensionHeaders?.map((header) => ({
          name: header.name ?? "",
        })) ?? [],
      metricHeaders:
        data.metricHeaders?.map((header) => ({
          name: header.name ?? "",
          type: header.type ?? "",
        })) ?? [],
      rows:
        data.rows?.map((row) => ({
          dimensionValues:
            row.dimensionValues?.map((value) => ({
              value: value.value ?? "",
            })) ?? [],
          metricValues:
            row.metricValues?.map((value) => ({
              value: value.value ?? "",
            })) ?? [],
        })) ?? [],
      rowCount: data.rowCount ?? 0,
    };
  }

  /**
   * APIエラーをハンドリングする
   */
  private handleApiError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message;

      // GA4 APIエラーコードに基づいた分類
      if (message.includes("PERMISSION_DENIED")) {
        return new AuthenticationError(
          "GA4プロパティへのアクセス権限がありません",
        );
      }
      if (message.includes("QUOTA_EXCEEDED")) {
        return new QuotaExceededError();
      }
      if (message.includes("INVALID_ARGUMENT")) {
        return new ApiError("GA4 APIリクエストが無効です", error);
      }
      return new NetworkError("GA4 APIとの通信に失敗しました", error);
    }
    return new ApiError("予期しないエラーが発生しました");
  }

  /**
   * バッチでレポートを実行する
   */
  async runBatchReports(
    requests: GA4ReportRequest[],
  ): Promise<GA4ReportResponse[]> {
    // 並列実行(最大4並列)
    const batchSize = 4;
    const results: GA4ReportResponse[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((req) => this.runReportWithRetry(req)),
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          const index = i + j;
          console.error(`Report ${String(index)} failed:`, result.reason);
          throw result.reason;
        }
      }
    }

    return results;
  }

  /**
   * 接続テストを実行する
   */
  private async testConnection(): Promise<void> {
    // 最小限のクエリで接続テスト
    await this.runReport({
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      limit: 1,
    });
  }
}
