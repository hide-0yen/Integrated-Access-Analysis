/**
 * check_config ツール
 * 現在の設定を確認
 */

import { ConfigurationLoader } from "@/infrastructure/config-loader";
import { loadConfigFromEnv } from "@/mcp/config";
import { toMCPError } from "@/mcp/utils/error-handler";
import type { MCPResponse } from "@/mcp/types";
import type {
  CheckConfigInput,
  CheckConfigInputSchema,
} from "@/mcp/utils/validator";
import type { AppConfig } from "@/types/models";
import type { ToolDefinition } from "@/mcp/types";

/**
 * check_config ツールハンドラー
 */
async function handleCheckConfig(
  _input: CheckConfigInput,
): Promise<MCPResponse<AppConfig>> {
  try {
    // 環境変数から設定を読み込み
    const envConfig = loadConfigFromEnv();

    // ConfigurationLoaderで完全な設定を取得
    const configLoader = new ConfigurationLoader();
    let config = await configLoader.load();

    // 環境変数で設定を上書き（MCP設定を優先）
    config = { ...config, ...envConfig };

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    return toMCPError(error as Error);
  }
}

/**
 * check_config ツール定義
 */
export function createCheckConfigTool(
  inputSchema: typeof CheckConfigInputSchema,
): ToolDefinition<CheckConfigInput, AppConfig> {
  return {
    name: "check_config",
    description: "GA4 Analyzerの現在の設定を確認します。",
    inputSchema,
    handler: handleCheckConfig,
  };
}
