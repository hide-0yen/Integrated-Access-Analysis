/**
 * LLMQueryParser
 * Claude APIを使用して自然言語クエリを構造化データに変換
 */

import { ClaudeClient } from "@/infrastructure/claude-client";
import {
  RawParsedQuerySchema,
  type RawParsedQuery,
} from "@/domain/types/exploratory-query";
import { buildQueryParsingPrompt } from "@/infrastructure/query-templates/intent-classification";

/**
 * LLM解析エラー
 */
export class LLMParsingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMParsingError";
  }
}

/**
 * LLMQueryParser設定
 */
export interface LLMQueryParserConfig {
  claudeClient: ClaudeClient;
  enableFallback?: boolean;
}

/**
 * LLMQueryParser
 * 自然言語クエリをLLMで解析し、構造化データに変換
 */
export class LLMQueryParser {
  private claudeClient: ClaudeClient;
  private enableFallback: boolean;

  constructor(config: LLMQueryParserConfig) {
    this.claudeClient = config.claudeClient;
    this.enableFallback = config.enableFallback ?? true;
  }

  /**
   * クエリを解析
   */
  async parse(query: string): Promise<RawParsedQuery> {
    try {
      // プロンプト構築
      const prompt = buildQueryParsingPrompt(query);

      // Claude APIに送信
      const response = await this.claudeClient.sendMessage(prompt);

      // JSONを抽出
      const jsonMatch = this.extractJSON(response);
      if (!jsonMatch) {
        throw new LLMParsingError(
          "Failed to extract JSON from LLM response",
          response,
        );
      }

      // JSONをパース
      const parsed: unknown = JSON.parse(jsonMatch);

      // Zodバリデーション
      const validated = RawParsedQuerySchema.parse(parsed);

      return validated;
    } catch (error) {
      if (error instanceof LLMParsingError) {
        throw error;
      }

      // その他のエラーは LLMParsingError でラップ
      throw new LLMParsingError(
        `Failed to parse query with LLM: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  /**
   * レスポンスからJSONを抽出
   * ```json ... ``` または { ... } 形式に対応
   */
  private extractJSON(response: string): string | null {
    // コードブロック形式の検出
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      return codeBlockMatch[1].trim();
    }

    // 生のJSON形式の検出
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      return jsonMatch[0].trim();
    }

    return null;
  }

  /**
   * フォールバック有効かどうか
   */
  isFallbackEnabled(): boolean {
    return this.enableFallback;
  }
}
