/**
 * ConfigurationLoader
 * 環境変数と設定ファイルから設定を読み込み、検証する
 */

import { readFile, access, constants } from "fs/promises";
import { join, resolve, dirname, isAbsolute } from "path";
import { homedir } from "os";
import { z } from "zod";
import { ConfigurationError } from "@/types/errors";
import { AppConfig, ComparisonType } from "@/types/models";

/**
 * 設定スキーマ
 */
const ConfigSchema = z.object({
  ga4PropertyId: z
    .string()
    .regex(/^\d+$/, "GA4 Property IDは数値である必要があります")
    .min(1, "GA4 Property IDが空です"),
  serviceAccountKeyPath: z.string().optional(),
  defaultComparisonPeriod: z
    .enum(["previous_day", "previous_week", "previous_month", "custom"])
    .default("previous_day"),
  verbose: z.boolean().default(false),
  enableGSC: z.boolean().default(false),
  gscSiteUrl: z
    .union([
      z.string().refine((val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      }, "GSC Site URLは有効なURLである必要があります"),
      z.literal("").transform(() => undefined),
    ])
    .optional(),
  maxRetries: z
    .number()
    .int()
    .min(0, "maxRetriesは0以上である必要があります")
    .max(10, "maxRetriesは10以下である必要があります")
    .default(3)
    .optional(),
  requestTimeout: z
    .number()
    .int()
    .min(1000, "requestTimeoutは1000ms以上である必要があります")
    .max(60000, "requestTimeoutは60000ms以下である必要があります")
    .default(30000)
    .optional(),
  dataLimit: z
    .number()
    .int()
    .min(1, "dataLimitは1以上である必要があります")
    .max(1000, "dataLimitは1000以下である必要があります")
    .default(100)
    .optional(),
  enablePerformanceMonitoring: z.boolean().default(false).optional(),
  claude: z
    .object({
      apiKey: z.string().optional(),
      model: z.string().optional(),
      maxTokens: z.number().int().min(256).max(4096).optional(),
      timeout: z.number().int().min(1000).max(60000).optional(),
    })
    .optional(),
});

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * ConfigurationLoaderクラス
 */
export class ConfigurationLoader {
  /**
   * 設定を読み込む
   */
  async load(): Promise<AppConfig> {
    // 1. 環境変数
    const envConfig = this.loadFromEnv();

    // 2. ホームディレクトリの設定ファイル
    const homeConfig = await this.loadFromFile(join(homedir(), ".ga4rc.json"));

    // 3. カレントディレクトリの設定ファイル
    const localConfig = await this.loadFromFile(".ga4rc.json");

    // マージ(環境変数が最優先)
    const merged = {
      ...homeConfig,
      ...localConfig,
      ...envConfig,
    };

    // 検証
    try {
      const validated = ConfigSchema.parse(merged);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        throw new ConfigurationError(
          `設定の検証に失敗しました: ${errorMessages}`,
        );
      }
      throw error;
    }
  }

  /**
   * 環境変数から設定を読み込む
   */
  private loadFromEnv(): Partial<AppConfig> {
    const config: Partial<AppConfig> = {};

    if (process.env.GA4_PROPERTY_ID) {
      config.ga4PropertyId = process.env.GA4_PROPERTY_ID;
    }

    if (process.env.GA4_SERVICE_ACCOUNT_KEY) {
      config.serviceAccountKeyPath = process.env.GA4_SERVICE_ACCOUNT_KEY;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      config.serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    if (process.env.GA4_DEFAULT_COMPARISON) {
      config.defaultComparisonPeriod = process.env
        .GA4_DEFAULT_COMPARISON as ComparisonType;
    }

    if (process.env.GA4_VERBOSE === "true" || process.env.GA4_VERBOSE === "1") {
      config.verbose = true;
    }

    if (process.env.GA4_ENABLE_GSC === "true") {
      config.enableGSC = true;
    }

    if (process.env.GA4_GSC_SITE_URL) {
      config.gscSiteUrl = process.env.GA4_GSC_SITE_URL;
    }

    if (process.env.GA4_MAX_RETRIES) {
      config.maxRetries = Number.parseInt(process.env.GA4_MAX_RETRIES, 10);
    }

    if (process.env.GA4_REQUEST_TIMEOUT) {
      config.requestTimeout = Number.parseInt(
        process.env.GA4_REQUEST_TIMEOUT,
        10,
      );
    }

    if (process.env.GA4_DATA_LIMIT) {
      config.dataLimit = Number.parseInt(process.env.GA4_DATA_LIMIT, 10);
    }

    if (
      process.env.GA4_ENABLE_PERFORMANCE_MONITORING === "true" ||
      process.env.GA4_ENABLE_PERFORMANCE_MONITORING === "1"
    ) {
      config.enablePerformanceMonitoring = true;
    }

    // Claude API設定
    if (process.env.ANTHROPIC_API_KEY) {
      if (!config.claude) {
        config.claude = {};
      }
      config.claude.apiKey = process.env.ANTHROPIC_API_KEY;
    }

    if (process.env.CLAUDE_MODEL) {
      if (!config.claude) {
        config.claude = {};
      }
      config.claude.model = process.env.CLAUDE_MODEL;
    }

    if (process.env.CLAUDE_MAX_TOKENS) {
      if (!config.claude) {
        config.claude = {};
      }
      config.claude.maxTokens = Number.parseInt(
        process.env.CLAUDE_MAX_TOKENS,
        10,
      );
    }

    if (process.env.CLAUDE_TIMEOUT) {
      if (!config.claude) {
        config.claude = {};
      }
      config.claude.timeout = Number.parseInt(process.env.CLAUDE_TIMEOUT, 10);
    }

    return config;
  }

  /**
   * ファイルから設定を読み込む
   */
  private async loadFromFile(filePath: string): Promise<Partial<AppConfig>> {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed: unknown = JSON.parse(content);
      const config = parsed as Partial<AppConfig>;

      // 相対パスを絶対パスに変換（設定ファイルのディレクトリを基準）
      if (
        config.serviceAccountKeyPath &&
        !isAbsolute(config.serviceAccountKeyPath)
      ) {
        const configDir = dirname(filePath);
        config.serviceAccountKeyPath = resolve(
          configDir,
          config.serviceAccountKeyPath,
        );
      }

      return config;
    } catch {
      // ファイルが存在しない、または読み取れない場合は空のオブジェクトを返す
      return {};
    }
  }

  /**
   * 設定を検証する
   */
  async validate(config: AppConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Property IDの存在確認
    if (!config.ga4PropertyId) {
      errors.push("GA4 Property IDが設定されていません");
    }

    // 認証情報の存在確認
    if (
      !config.serviceAccountKeyPath &&
      !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      errors.push(
        "認証情報が設定されていません。GA4_SERVICE_ACCOUNT_KEYまたはGOOGLE_APPLICATION_CREDENTIALSを設定してください",
      );
    }

    // サービスアカウントキーファイルの存在確認
    if (config.serviceAccountKeyPath) {
      try {
        await access(config.serviceAccountKeyPath, constants.R_OK);
      } catch {
        errors.push(
          `サービスアカウントキーが見つかりません: ${config.serviceAccountKeyPath}`,
        );
      }
    }

    // GSC設定の整合性チェック
    if (config.enableGSC && !config.gscSiteUrl) {
      errors.push("GSCを有効にする場合はgscSiteUrlを設定する必要があります");
    }

    // GSC URL フォーマットチェック
    if (config.gscSiteUrl) {
      try {
        const url = new URL(config.gscSiteUrl);
        if (!url.protocol.startsWith("http")) {
          errors.push(
            "GSC Site URLはhttp://またはhttps://で始まる必要があります",
          );
        }
      } catch {
        errors.push(
          `GSC Site URLのフォーマットが不正です: ${config.gscSiteUrl}`,
        );
      }
    }

    // パフォーマンス設定の範囲チェック
    if (
      config.maxRetries !== undefined &&
      (config.maxRetries < 0 || config.maxRetries > 10)
    ) {
      errors.push("maxRetriesは0から10の範囲で指定してください");
    }

    if (
      config.requestTimeout !== undefined &&
      (config.requestTimeout < 1000 || config.requestTimeout > 60000)
    ) {
      errors.push("requestTimeoutは1000msから60000msの範囲で指定してください");
    }

    if (
      config.dataLimit !== undefined &&
      (config.dataLimit < 1 || config.dataLimit > 1000)
    ) {
      errors.push("dataLimitは1から1000の範囲で指定してください");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
