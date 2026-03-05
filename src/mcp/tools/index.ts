/**
 * MCPツール登録
 */

import { createAnalyzeExploratoryTool } from "./analyze-exploratory.js";
import { createAnalyzeComparisonTool } from "./analyze-comparison.js";
import { createCheckConfigTool } from "./check-config.js";
import { createValidateConfigTool } from "./validate-config.js";
import {
  AnalyzeExploratoryInputSchema,
  AnalyzeComparisonInputSchema,
  CheckConfigInputSchema,
  ValidateConfigInputSchema,
} from "@/mcp/utils/validator.js";
import type { ToolDefinition } from "@/mcp/types";

/**
 * すべてのツールを登録して返す
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerTools(): ToolDefinition<any, any>[] {
  return [
    createAnalyzeExploratoryTool(AnalyzeExploratoryInputSchema),
    createAnalyzeComparisonTool(AnalyzeComparisonInputSchema),
    createCheckConfigTool(CheckConfigInputSchema),
    createValidateConfigTool(ValidateConfigInputSchema),
  ];
}
