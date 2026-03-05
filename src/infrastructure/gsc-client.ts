/**
 * GSCApiClient
 * Google Search Console API v1との通信を管理
 */

import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import {
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
} from "@/types/errors";
import {
  GSCConfig,
  GSCSearchAnalyticsRequest,
  GSCSearchAnalyticsResponse,
} from "@/types/models";

/**
 * GSCApiClientクラス
 */
export class GSCApiClient {
  private searchConsole: ReturnType<typeof google.webmasters> | null = null;
  private siteUrl: string = "";

  /**
   * クライアントを初期化する
   */
  async initialize(config: GSCConfig): Promise<void> {
    try {
      let auth: GoogleAuth;

      if (config.serviceAccountKeyPath) {
        // サービスアカウントキーファイルから認証
        auth = new GoogleAuth({
          keyFile: config.serviceAccountKeyPath,
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        });
      } else if (config.credentials) {
        // GoogleAuthインスタンスから認証
        auth = config.credentials as GoogleAuth;
      } else {
        // GOOGLE_APPLICATION_CREDENTIALS環境変数を使用
        auth = new GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        });
      }

      this.searchConsole = google.webmasters({
        version: "v3",
        auth,
      });

      this.siteUrl = config.siteUrl;

      // 認証テスト
      await this.testConnection();
    } catch (error) {
      throw new AuthenticationError("GSC認証に失敗しました", error);
    }
  }

  /**
   * 検索分析データを取得する
   */
  async searchAnalyticsQuery(
    request: GSCSearchAnalyticsRequest,
  ): Promise<GSCSearchAnalyticsResponse> {
    if (!this.searchConsole) {
      throw new ApiError("GSCClientが初期化されていません");
    }

    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: request.startDate,
          endDate: request.endDate,
          dimensions: request.dimensions,
          rowLimit: request.rowLimit ?? 10,
          startRow: request.startRow ?? 0,
        },
      });

      return this.transformResponse(response.data);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * レスポンスを変換する
   */
  private transformResponse(data: unknown): GSCSearchAnalyticsResponse {
    const response = data as {
      rows?: Array<{
        keys?: string[];
        clicks?: number;
        impressions?: number;
        ctr?: number;
        position?: number;
      }>;
      responseAggregationType?: string;
    };

    return {
      rows:
        response.rows?.map((row) => ({
          keys: row.keys ?? [],
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })) ?? [],
      responseAggregationType: response.responseAggregationType,
    };
  }

  /**
   * APIエラーをハンドリングする
   */
  private handleApiError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message;

      // GSC APIエラーコードに基づいた分類
      if (message.includes("403") || message.includes("PERMISSION_DENIED")) {
        return new AuthenticationError(
          "GSCプロパティへのアクセス権限がありません",
        );
      }
      if (message.includes("429") || message.includes("QUOTA_EXCEEDED")) {
        return new QuotaExceededError();
      }
      if (message.includes("400") || message.includes("INVALID_ARGUMENT")) {
        return new ApiError("GSC APIリクエストが無効です", error);
      }
      if (message.includes("404")) {
        return new ApiError(
          "GSCプロパティが見つかりません。サイトURLを確認してください。",
          error,
        );
      }
      return new NetworkError("GSC APIとの通信に失敗しました", error);
    }
    return new ApiError("予期しないエラーが発生しました");
  }

  /**
   * リトライ付きで検索分析データを取得する
   */
  async searchAnalyticsQueryWithRetry(
    request: GSCSearchAnalyticsRequest,
    maxRetries = 3,
  ): Promise<GSCSearchAnalyticsResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.searchAnalyticsQuery(request);
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
   * 接続テストを実行する
   */
  private async testConnection(): Promise<void> {
    if (!this.searchConsole) {
      throw new ApiError("GSCClientが初期化されていません");
    }

    try {
      // サイトリストを取得して接続テスト
      await this.searchConsole.sites.list();
    } catch (error) {
      throw new AuthenticationError(
        "GSC接続テストに失敗しました。認証情報を確認してください。",
        error,
      );
    }
  }
}
