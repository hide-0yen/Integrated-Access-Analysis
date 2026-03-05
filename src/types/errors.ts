/**
 * エラークラス階層
 * GA4 Analyzer全体で使用する統一されたエラー体系
 */

/**
 * 基底エラークラス
 * すべてのカスタムエラーはこのクラスを継承する
 */
export class GA4AnalyzerError extends Error {
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "GA4AnalyzerError";
    // スタックトレースを正しく設定
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 設定関連のエラー
 * 環境変数や設定ファイルの読み込みに失敗した場合にスローされる
 */
export class ConfigurationError extends GA4AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ConfigurationError";
  }
}

/**
 * 認証関連のエラー
 * サービスアカウント認証やAPIアクセス権限に問題がある場合にスローされる
 */
export class AuthenticationError extends GA4AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "AuthenticationError";
  }
}

/**
 * API呼び出しの一般的なエラー
 * GA4 APIやGSC APIとの通信で問題が発生した場合にスローされる
 */
export class ApiError extends GA4AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ApiError";
  }
}

/**
 * APIクォータ超過エラー
 * APIの呼び出し制限を超過した場合にスローされる
 * このエラーはリトライすべきではない
 */
export class QuotaExceededError extends ApiError {
  constructor(message = "GA4 APIのクォータを超過しました", cause?: unknown) {
    super(message, cause);
    this.name = "QuotaExceededError";
  }
}

/**
 * ネットワークエラー
 * タイムアウトやネットワーク接続の問題でAPIコールが失敗した場合にスローされる
 * このエラーはリトライ可能
 */
export class NetworkError extends ApiError {
  constructor(message = "ネットワークエラーが発生しました", cause?: unknown) {
    super(message, cause);
    this.name = "NetworkError";
  }
}

/**
 * クエリ解析エラー
 * 自然言語クエリのパースに失敗した場合にスローされる
 */
export class ParseError extends GA4AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ParseError";
  }
}
