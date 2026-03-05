/**
 * MCP型定義
 * Model Context Protocol関連の型定義
 */

import type { z } from "zod";

/**
 * MCPツールのレスポンス型
 */
export interface MCPSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface MCPErrorResponse {
  success: false;
  error: {
    code: MCPErrorCode;
    message: string;
    details?: Record<string, unknown>;
    cause?: Error;
  };
}

export type MCPResponse<T = unknown> = MCPSuccessResponse<T> | MCPErrorResponse;

/**
 * MCPエラーコード
 */
export enum MCPErrorCode {
  // 設定エラー
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",

  // 認証エラー
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",

  // API関連エラー
  API_ERROR = "API_ERROR",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NETWORK_ERROR = "NETWORK_ERROR",

  // クエリ解析エラー
  PARSE_ERROR = "PARSE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // 内部エラー
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * MCPツール入力スキーマの型ヘルパー
 */
export type InferToolInput<T extends z.ZodType> = z.infer<T>;

/**
 * MCPツールハンドラー型
 */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => Promise<MCPResponse<TOutput>>;

/**
 * MCPツール定義
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  handler: ToolHandler<TInput, TOutput>;
}

/**
 * MCP設定
 */
export interface MCPConfig {
  name: string;
  version: string;
  description: string;
}
