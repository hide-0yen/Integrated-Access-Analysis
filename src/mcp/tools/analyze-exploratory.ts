/**
 * analyze_exploratory ツール
 * 探索的分析を実行
 */

// import { ExploratoryAnalysisOrchestrator } from "@/application/exploratory-analysis-orchestrator";
import { ConfigurationLoader } from "@/infrastructure/config-loader";
import { AuthenticationManager } from "@/infrastructure/auth-manager";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import { loadConfigFromEnv } from "@/mcp/config";
import { toMCPError } from "@/mcp/utils/error-handler";
import type { MCPResponse } from "@/mcp/types";
import type {
  AnalyzeExploratoryInput,
  AnalyzeExploratoryInputSchema,
} from "@/mcp/utils/validator";
import type { ExploratoryAnalysisResult } from "@/application/exploratory-analysis-orchestrator";
import type { ToolDefinition } from "@/mcp/types";

/**
 * analyze_exploratory ツールハンドラー
 */
async function handleAnalyzeExploratory(
  _input: AnalyzeExploratoryInput,
): Promise<MCPResponse<ExploratoryAnalysisResult>> {
  try {
    // 環境変数から設定を読み込み
    const envConfig = loadConfigFromEnv();

    // ConfigurationLoaderで完全な設定を取得
    const configLoader = new ConfigurationLoader();
    let config = await configLoader.load();

    // 環境変数で設定を上書き（MCP設定を優先）
    config = { ...config, ...envConfig };

    // 認証情報を読み込み
    const authManager = new AuthenticationManager();
    const credentials = authManager.loadCredentials({
      serviceAccountKeyPath: config.serviceAccountKeyPath,
      useApplicationDefaultCredentials: !config.serviceAccountKeyPath,
    });

    // GA4クライアントを初期化
    const ga4Client = new GA4ApiClient();
    await ga4Client.initialize({
      propertyId: config.ga4PropertyId,
      credentials: credentials,
    });

    // ExploratoryAnalysisOrchestratorを作成
    // Note: Phase 1でClaudeClientは削除されるため、ここでは使用しない
    // 代わりに、クエリは既に構造化されているものとして扱う
    // または、ルールベースパーサーを使用する

    // 暫定: ルールベースパーサーを使用する想定
    // （実際の実装では、Claude Code経由でクエリ解析を依頼する）

    throw new Error(
      "analyze_exploratory: Claude API依存のため、現在未実装。ルールベースパーサーへの移行が必要です。",
    );

    // const orchestrator = new ExploratoryAnalysisOrchestrator(
    //   claudeClient,
    //   ga4Client,
    //   config.ga4PropertyId
    // );

    // const result = await orchestrator.analyzeWithRanking(input.query, {
    //   skipConfirmation: input.options.skipConfirmation,
    //   baseDate: input.options.baseDate ? new Date(input.options.baseDate) : undefined,
    //   topN: input.options.topN,
    //   rankBy: input.options.rankBy,
    // });

    // return {
    //   success: true,
    //   data: result,
    // };
  } catch (error) {
    return toMCPError(error as Error);
  }
}

/**
 * analyze_exploratory ツール定義
 */
export function createAnalyzeExploratoryTool(
  inputSchema: typeof AnalyzeExploratoryInputSchema,
): ToolDefinition<AnalyzeExploratoryInput, ExploratoryAnalysisResult> {
  return {
    name: "analyze_exploratory",
    description:
      "自然言語クエリからGA4データの探索的分析を実行します。期間指定、フィルター、検出タイプを柔軟に指定できます。",
    inputSchema,
    handler: handleAnalyzeExploratory,
  };
}
