/**
 * ErrorHandler
 * エラーハンドリングとユーザーフレンドリーなメッセージ変換を統一管理
 */

import {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "@/types/errors";

/**
 * エラーの重要度
 */
export type ErrorSeverity = "critical" | "error" | "warning";

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
  operation?: string;
  timestamp?: Date;
  [key: string]: unknown;
}

/**
 * APIエラーをユーザーフレンドリーなメッセージに変換
 */
export function formatUserMessage(error: Error): string {
  if (error instanceof ConfigurationError) {
    return `設定エラー: ${error.message}\n\n設定ファイルまたは環境変数を確認してください。\n詳細: ga4-analyzer --check-config`;
  }

  if (error instanceof AuthenticationError) {
    return `認証エラー: ${error.message}\n\nサービスアカウントの設定を確認してください:\n1. キーファイルのパスが正しいか確認\n2. サービスアカウントにGA4/GSCプロパティの閲覧権限があるか確認\n3. キーファイルの形式が正しいか（JSON形式）確認`;
  }

  if (error instanceof QuotaExceededError) {
    return `APIクォータ超過: ${error.message}\n\nしばらく時間をおいてから再実行してください。\nGA4 Data APIの制限:\n- 1日あたり: 25,000トークン\n- 1時間あたり: 5,000トークン`;
  }

  if (error instanceof NetworkError) {
    return `ネットワークエラー: ${error.message}\n\nインターネット接続を確認してください:\n1. ネットワーク接続の確認\n2. ファイアウォール設定の確認\n3. プロキシ設定の確認（必要に応じて）`;
  }

  if (error instanceof ParseError) {
    return `クエリ解析エラー: ${error.message}\n\n入力形式を確認してください。\n例: "昨日のアクセス増の要因", "3/3のトラフィック"`;
  }

  if (error instanceof ApiError) {
    return `APIエラー: ${error.message}\n\nGA4/GSC APIとの通信中にエラーが発生しました。\nしばらく待ってから再実行してください。`;
  }

  if (error instanceof GA4AnalyzerError) {
    return `エラー: ${error.message}`;
  }

  // 予期しないエラー
  return `予期しないエラーが発生しました: ${error.message}\n\n問題が解決しない場合は、--verbose オプションで詳細ログを確認してください。`;
}

/**
 * エラーの重要度を判定
 */
export function getSeverity(error: Error): ErrorSeverity {
  if (
    error instanceof ConfigurationError ||
    error instanceof AuthenticationError
  ) {
    return "critical";
  }

  if (
    error instanceof QuotaExceededError ||
    error instanceof ApiError ||
    error instanceof NetworkError
  ) {
    return "error";
  }

  if (error instanceof ParseError) {
    return "warning";
  }

  return "error";
}

/**
 * リトライ可能なエラーかどうか判定
 */
export function isRetryable(error: Error): boolean {
  // NetworkErrorはリトライ可能
  if (error instanceof NetworkError) {
    return true;
  }

  // QuotaExceededError、AuthenticationError、ConfigurationErrorはリトライ不可
  if (
    error instanceof QuotaExceededError ||
    error instanceof AuthenticationError ||
    error instanceof ConfigurationError
  ) {
    return false;
  }

  // ApiErrorは一部リトライ可能（5xx系エラー）
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    return (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  }

  return false;
}

/**
 * エラーログを構造化して出力
 */
export function logError(
  error: Error,
  context: ErrorContext = {},
  verbose = false,
): void {
  const severity = getSeverity(error);
  const timestamp = context.timestamp ?? new Date();
  const operation = context.operation ?? "unknown";

  if (verbose) {
    // 詳細ログ（開発者向け）
    console.error("=== Error Details ===");
    console.error(`Timestamp: ${timestamp.toISOString()}`);
    console.error(`Severity: ${severity}`);
    console.error(`Operation: ${operation}`);
    console.error(`Error Type: ${error.constructor.name}`);
    console.error(`Message: ${error.message}`);
    if (error.stack) {
      console.error(`Stack Trace:\n${error.stack}`);
    }
    if (Object.keys(context).length > 0) {
      console.error(`Context: ${JSON.stringify(context, null, 2)}`);
    }
    console.error("===================");
  } else {
    // 簡潔なログ（エンドユーザー向け）
    const icon =
      severity === "critical" ? "❌" : severity === "error" ? "⚠️" : "ℹ️";
    console.error(`${icon} ${formatUserMessage(error)}`);
  }
}

/**
 * エラーをラップして詳細情報を追加
 */
export function wrapError(
  originalError: Error,
  operation: string,
  additionalContext?: Record<string, unknown>,
): Error {
  const context: ErrorContext = {
    operation,
    timestamp: new Date(),
    originalError: originalError.message,
    ...additionalContext,
  };

  // エラータイプを保持しながらコンテキストを追加
  if (originalError instanceof GA4AnalyzerError) {
    originalError.context = {
      ...originalError.context,
      ...context,
    };
    return originalError;
  }

  // カスタムエラーでない場合は新しいエラーを作成
  const wrappedError = new GA4AnalyzerError(
    `${operation}: ${originalError.message}`,
    originalError,
  );
  wrappedError.context = context;
  return wrappedError;
}

/**
 * ErrorHandler - レガシー互換のためのエクスポート
 */
export const ErrorHandler = {
  formatUserMessage,
  getSeverity,
  isRetryable,
  logError,
  wrapError,
};
