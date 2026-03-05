/**
 * Zodスキーマ定義
 * MCPツールの入力バリデーション用
 */

import { z } from "zod";

/**
 * analyze_exploratory ツール入力スキーマ
 */
export const AnalyzeExploratoryInputSchema = z.object({
  query: z.string().min(1, "クエリは必須です"),
  options: z
    .object({
      skipConfirmation: z.boolean().default(true),
      baseDate: z.string().optional(),
      topN: z.number().int().positive().default(10),
      rankBy: z.enum(["changeRate", "value"]).default("changeRate"),
    })
    .default({
      skipConfirmation: true,
      topN: 10,
      rankBy: "changeRate",
    }),
});

export type AnalyzeExploratoryInput = z.infer<
  typeof AnalyzeExploratoryInputSchema
>;

/**
 * analyze_comparison ツール入力スキーマ
 */
export const AnalyzeComparisonInputSchema = z.object({
  query: z.string().min(1, "クエリは必須です"),
  options: z
    .object({
      verbose: z.boolean().default(false),
      compareType: z.string().optional(),
      propertyId: z.string().optional(),
    })
    .default({
      verbose: false,
    }),
});

export type AnalyzeComparisonInput = z.infer<
  typeof AnalyzeComparisonInputSchema
>;

/**
 * check_config ツール入力スキーマ
 */
export const CheckConfigInputSchema = z.object({});

export type CheckConfigInput = z.infer<typeof CheckConfigInputSchema>;

/**
 * validate_config ツール入力スキーマ
 */
export const ValidateConfigInputSchema = z.object({});

export type ValidateConfigInput = z.infer<typeof ValidateConfigInputSchema>;
