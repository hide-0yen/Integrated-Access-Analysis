/**
 * analyze_comparison ツール
 * 比較分析を実行（Claude API不要）
 */

import { QueryOrchestrator } from "@/application/query-orchestrator";
import { loadConfigFromEnv } from "@/mcp/config";
import { toMCPError } from "@/mcp/utils/error-handler";
import type { MCPResponse } from "@/mcp/types";
import type {
  AnalyzeComparisonInput,
  AnalyzeComparisonInputSchema,
} from "@/mcp/utils/validator";
import type { IntegratedAnalysisResult } from "@/application/insight-generator";
import type { ToolDefinition } from "@/mcp/types";

/**
 * analyze_comparison ツールハンドラー
 * forceComparisonMode を使用して強制的に比較分析を実行（Claude API不要）
 */
async function handleAnalyzeComparison(
  input: AnalyzeComparisonInput,
): Promise<MCPResponse<IntegratedAnalysisResult>> {
  try {
    // 環境変数から設定を読み込み（MCP設定を優先）
    const envConfig = loadConfigFromEnv();

    // QueryOrchestratorを作成
    const orchestrator = new QueryOrchestrator();

    // オプションを環境変数設定とマージ
    // forceComparisonMode を true に設定して、自動判定をスキップ
    const options = {
      verbose: input.options.verbose,
      compareType: input.options.compareType,
      propertyId: input.options.propertyId || envConfig.ga4PropertyId,
      forceComparisonMode: true, // 常に比較分析として実行
    };

    // 比較分析を実行
    const result = await orchestrator.execute(input.query, options);

    // 比較分析の結果のみを返す（探索的分析は除外）
    if ("detections" in result) {
      throw new Error(
        "Unexpected exploratory analysis result in comparison tool",
      );
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return toMCPError(error as Error);
  }
}

/**
 * analyze_comparison ツール定義
 */
export function createAnalyzeComparisonTool(
  inputSchema: typeof AnalyzeComparisonInputSchema,
): ToolDefinition<AnalyzeComparisonInput, IntegratedAnalysisResult> {
  return {
    name: "analyze_comparison",
    description:
      "GA4データの比較分析を実行します。2つの期間を比較し、トラフィックソース、ページ、デバイス、イベント、検索キーワードの5軸で分析します。Claude API不要。",
    inputSchema,
    handler: handleAnalyzeComparison,
  };
}
