/**
 * MCPエラーハンドリングユーティリティ
 */

import {
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "@/types/errors";
import { MCPErrorCode, type MCPErrorResponse } from "@/mcp/types";

/**
 * エラーをMCPErrorResponseに変換
 */
export function toMCPError(error: Error): MCPErrorResponse {
  // カスタムエラーからMCPエラーコードにマッピング
  if (error instanceof ConfigurationError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.CONFIGURATION_ERROR,
        message: error.message,
        details: {
          suggestion:
            "環境変数またはMCP設定ファイルで認証情報を設定してください。",
        },
        cause: error,
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.AUTHENTICATION_ERROR,
        message: error.message,
        details: {
          suggestion:
            "サービスアカウントにGA4プロパティの閲覧権限があることを確認してください。",
        },
        cause: error,
      },
    };
  }

  if (error instanceof QuotaExceededError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.QUOTA_EXCEEDED,
        message: "GA4 Data APIの利用制限に達しました。",
        details: {
          dailyLimit: 25000,
          hourlyLimit: 5000,
          suggestion: "しばらく時間をおいてから再実行してください。",
        },
        cause: error,
      },
    };
  }

  if (error instanceof NetworkError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.NETWORK_ERROR,
        message: error.message,
        details: {
          suggestion:
            "インターネット接続を確認し、しばらく待ってから再実行してください。",
        },
        cause: error,
      },
    };
  }

  if (error instanceof ParseError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.PARSE_ERROR,
        message: error.message,
        details: {
          suggestion:
            "クエリの形式を確認してください。例: '昨日のアクセス増の要因'",
        },
        cause: error,
      },
    };
  }

  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: MCPErrorCode.API_ERROR,
        message: error.message,
        details: {
          suggestion: "GA4プロパティIDが正しいか確認してください。",
        },
        cause: error,
      },
    };
  }

  // その他のエラー
  return {
    success: false,
    error: {
      code: MCPErrorCode.INTERNAL_ERROR,
      message: error.message || "予期しないエラーが発生しました",
      details: {
        errorType: error.constructor.name,
      },
      cause: error,
    },
  };
}

/**
 * バリデーションエラーを生成
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>,
): MCPErrorResponse {
  return {
    success: false,
    error: {
      code: MCPErrorCode.VALIDATION_ERROR,
      message,
      details,
    },
  };
}
