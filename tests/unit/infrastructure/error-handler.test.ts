/**
 * ErrorHandler Unit Tests
 */

import { describe, it, expect } from "vitest";
import { ErrorHandler } from "@/infrastructure/error-handler";
import {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "@/types/errors";

describe("ErrorHandler", () => {
  describe("formatUserMessage", () => {
    it("ConfigurationErrorを適切にフォーマット", () => {
      const error = new ConfigurationError("設定ファイルが見つかりません");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("設定エラー");
      expect(message).toContain("設定ファイルまたは環境変数を確認");
      expect(message).toContain("ga4-analyzer --check-config");
    });

    it("AuthenticationErrorを適切にフォーマット", () => {
      const error = new AuthenticationError("認証に失敗しました");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("認証エラー");
      expect(message).toContain("サービスアカウントの設定を確認");
      expect(message).toContain("閲覧権限があるか確認");
    });

    it("QuotaExceededErrorを適切にフォーマット", () => {
      const error = new QuotaExceededError();
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("APIクォータ超過");
      expect(message).toContain("しばらく時間をおいてから再実行");
      expect(message).toContain("25,000トークン");
    });

    it("NetworkErrorを適切にフォーマット", () => {
      const error = new NetworkError("タイムアウトしました");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("ネットワークエラー");
      expect(message).toContain("インターネット接続を確認");
      expect(message).toContain("ファイアウォール設定の確認");
    });

    it("ParseErrorを適切にフォーマット", () => {
      const error = new ParseError("日付を解析できません");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("クエリ解析エラー");
      expect(message).toContain("入力形式を確認");
      expect(message).toContain("昨日のアクセス増の要因");
    });

    it("ApiErrorを適切にフォーマット", () => {
      const error = new ApiError("APIエラーが発生しました");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("APIエラー");
      expect(message).toContain("しばらく待ってから再実行");
    });

    it("GA4AnalyzerErrorを適切にフォーマット", () => {
      const error = new GA4AnalyzerError("カスタムエラー");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("カスタムエラー");
    });

    it("予期しないエラーを適切にフォーマット", () => {
      const error = new Error("予期しないエラー");
      const message = ErrorHandler.formatUserMessage(error);

      expect(message).toContain("予期しないエラーが発生しました");
      expect(message).toContain("--verbose オプション");
    });
  });

  describe("getSeverity", () => {
    it("ConfigurationErrorはcritical", () => {
      const error = new ConfigurationError("設定エラー");
      expect(ErrorHandler.getSeverity(error)).toBe("critical");
    });

    it("AuthenticationErrorはcritical", () => {
      const error = new AuthenticationError("認証エラー");
      expect(ErrorHandler.getSeverity(error)).toBe("critical");
    });

    it("QuotaExceededErrorはerror", () => {
      const error = new QuotaExceededError();
      expect(ErrorHandler.getSeverity(error)).toBe("error");
    });

    it("ApiErrorはerror", () => {
      const error = new ApiError("APIエラー");
      expect(ErrorHandler.getSeverity(error)).toBe("error");
    });

    it("NetworkErrorはerror", () => {
      const error = new NetworkError();
      expect(ErrorHandler.getSeverity(error)).toBe("error");
    });

    it("ParseErrorはwarning", () => {
      const error = new ParseError("パースエラー");
      expect(ErrorHandler.getSeverity(error)).toBe("warning");
    });

    it("その他のエラーはerror", () => {
      const error = new Error("一般エラー");
      expect(ErrorHandler.getSeverity(error)).toBe("error");
    });
  });

  describe("isRetryable", () => {
    it("NetworkErrorはリトライ可能", () => {
      const error = new NetworkError();
      expect(ErrorHandler.isRetryable(error)).toBe(true);
    });

    it("QuotaExceededErrorはリトライ不可", () => {
      const error = new QuotaExceededError();
      expect(ErrorHandler.isRetryable(error)).toBe(false);
    });

    it("AuthenticationErrorはリトライ不可", () => {
      const error = new AuthenticationError("認証エラー");
      expect(ErrorHandler.isRetryable(error)).toBe(false);
    });

    it("ConfigurationErrorはリトライ不可", () => {
      const error = new ConfigurationError("設定エラー");
      expect(ErrorHandler.isRetryable(error)).toBe(false);
    });

    it("500系エラーを含むApiErrorはリトライ可能", () => {
      const error500 = new ApiError("500 Internal Server Error");
      expect(ErrorHandler.isRetryable(error500)).toBe(true);

      const error502 = new ApiError("502 Bad Gateway");
      expect(ErrorHandler.isRetryable(error502)).toBe(true);

      const error503 = new ApiError("503 Service Unavailable");
      expect(ErrorHandler.isRetryable(error503)).toBe(true);

      const error504 = new ApiError("504 Gateway Timeout");
      expect(ErrorHandler.isRetryable(error504)).toBe(true);
    });

    it("400系エラーを含むApiErrorはリトライ不可", () => {
      const error400 = new ApiError("400 Bad Request");
      expect(ErrorHandler.isRetryable(error400)).toBe(false);

      const error404 = new ApiError("404 Not Found");
      expect(ErrorHandler.isRetryable(error404)).toBe(false);
    });

    it("その他のエラーはリトライ不可", () => {
      const error = new Error("一般エラー");
      expect(ErrorHandler.isRetryable(error)).toBe(false);
    });
  });

  describe("wrapError", () => {
    it("元のエラーにコンテキスト情報を追加", () => {
      const originalError = new Error("元のエラー");
      const wrappedError = ErrorHandler.wrapError(
        originalError,
        "test-operation",
        { userId: "123" },
      );

      expect(wrappedError).toBeInstanceOf(GA4AnalyzerError);
      expect(wrappedError.message).toContain("test-operation");
      expect(wrappedError.message).toContain("元のエラー");
      expect((wrappedError as GA4AnalyzerError).context?.operation).toBe(
        "test-operation",
      );
      expect((wrappedError as GA4AnalyzerError).context?.userId).toBe("123");
    });

    it("GA4AnalyzerErrorの場合、既存のコンテキストを保持", () => {
      const originalError = new GA4AnalyzerError("カスタムエラー");
      originalError.context = { existingKey: "existingValue" };

      const wrappedError = ErrorHandler.wrapError(
        originalError,
        "test-operation",
        { newKey: "newValue" },
      );

      expect(wrappedError).toBe(originalError);
      expect((wrappedError as GA4AnalyzerError).context?.existingKey).toBe(
        "existingValue",
      );
      expect((wrappedError as GA4AnalyzerError).context?.newKey).toBe(
        "newValue",
      );
      expect((wrappedError as GA4AnalyzerError).context?.operation).toBe(
        "test-operation",
      );
    });

    it("timestampが自動的に追加される", () => {
      const originalError = new Error("テストエラー");
      const wrappedError = ErrorHandler.wrapError(
        originalError,
        "test-operation",
      );

      expect(
        (wrappedError as GA4AnalyzerError).context?.timestamp,
      ).toBeInstanceOf(Date);
    });

    it("originalErrorメッセージが保存される", () => {
      const originalError = new Error("元のメッセージ");
      const wrappedError = ErrorHandler.wrapError(
        originalError,
        "test-operation",
      );

      expect((wrappedError as GA4AnalyzerError).context?.originalError).toBe(
        "元のメッセージ",
      );
    });
  });
});
