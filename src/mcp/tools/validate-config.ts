/**
 * validate_config ツール
 * 設定を検証
 */

import { QueryOrchestrator } from "@/application/query-orchestrator";
import { toMCPError } from "@/mcp/utils/error-handler";
import type { MCPResponse } from "@/mcp/types";
import type {
  ValidateConfigInput,
  ValidateConfigInputSchema,
} from "@/mcp/utils/validator";
import type { ToolDefinition } from "@/mcp/types";

/**
 * 設定検証結果
 */
interface ValidateConfigResult {
  isValid: boolean;
  errors: string[];
}

/**
 * validate_config ツールハンドラー
 */
async function handleValidateConfig(
  _input: ValidateConfigInput,
): Promise<MCPResponse<ValidateConfigResult>> {
  try {
    const orchestrator = new QueryOrchestrator();
    const result = await orchestrator.validateConfig();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return toMCPError(error as Error);
  }
}

/**
 * validate_config ツール定義
 */
export function createValidateConfigTool(
  inputSchema: typeof ValidateConfigInputSchema,
): ToolDefinition<ValidateConfigInput, ValidateConfigResult> {
  return {
    name: "validate_config",
    description: "GA4 Analyzerの設定を検証し、問題があれば報告します。",
    inputSchema,
    handler: handleValidateConfig,
  };
}
