import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConfigurationLoader } from "@/infrastructure/config-loader";
import { ConfigurationError } from "@/types/errors";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("ConfigurationLoader", () => {
  let loader: ConfigurationLoader;
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;

  beforeEach(async () => {
    loader = new ConfigurationLoader();
    testDir = join(tmpdir(), `ga4-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // 環境変数とカレントディレクトリを保存
    originalEnv = { ...process.env };
    originalCwd = process.cwd();

    // テストディレクトリに移動
    process.chdir(testDir);
  });

  afterEach(async () => {
    // カレントディレクトリを復元
    process.chdir(originalCwd);

    // 環境変数を復元
    process.env = originalEnv;

    // テストディレクトリをクリーンアップ
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // エラーは無視
    }
  });

  describe("正常系: 環境変数からの読み込み", () => {
    it("should load configuration from environment variables", async () => {
      process.env.GA4_PROPERTY_ID = "123456789";
      process.env.GA4_SERVICE_ACCOUNT_KEY = "/path/to/key.json";
      process.env.GA4_DEFAULT_COMPARISON = "previous_week";
      process.env.GA4_VERBOSE = "true";

      const config = await loader.load();

      expect(config.ga4PropertyId).toBe("123456789");
      expect(config.serviceAccountKeyPath).toBe("/path/to/key.json");
      expect(config.defaultComparisonPeriod).toBe("previous_week");
      expect(config.verbose).toBe(true);
    });

    it("should use GOOGLE_APPLICATION_CREDENTIALS as fallback", async () => {
      process.env.GA4_PROPERTY_ID = "123456789";
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/gcp-key.json";

      const config = await loader.load();

      expect(config.serviceAccountKeyPath).toBe("/path/to/gcp-key.json");
    });

    it("should load GSC configuration from environment", async () => {
      process.env.GA4_PROPERTY_ID = "123456789";
      process.env.GA4_ENABLE_GSC = "true";
      process.env.GA4_GSC_SITE_URL = "https://example.com";

      const config = await loader.load();

      expect(config.enableGSC).toBe(true);
      expect(config.gscSiteUrl).toBe("https://example.com");
    });
  });

  describe("正常系: ファイルからの読み込み", () => {
    it("should load configuration from .ga4rc.json", async () => {
      const configFile = join(testDir, ".ga4rc.json");
      await writeFile(
        configFile,
        JSON.stringify({
          ga4PropertyId: "987654321",
          serviceAccountKeyPath: "/path/to/file-key.json",
          defaultComparisonPeriod: "previous_month",
          verbose: false,
        }),
      );

      // カレントディレクトリを変更する代わりに、環境変数を空にする
      process.env = {};

      // ファイルから読み込むためにローダーを直接テスト
      const privateLoader = loader as ConfigurationLoader & {
        loadFromFile: (path: string) => Promise<Partial<unknown>>;
      };
      const fileConfig = await privateLoader["loadFromFile"](configFile);

      expect(fileConfig).toEqual({
        ga4PropertyId: "987654321",
        serviceAccountKeyPath: "/path/to/file-key.json",
        defaultComparisonPeriod: "previous_month",
        verbose: false,
      });
    });

    it("should return empty object if config file does not exist", async () => {
      const privateLoader = loader as ConfigurationLoader & {
        loadFromFile: (path: string) => Promise<Partial<unknown>>;
      };
      const fileConfig =
        await privateLoader["loadFromFile"]("/nonexistent/path");

      expect(fileConfig).toEqual({});
    });
  });

  describe("正常系: 設定のマージ", () => {
    it("should prioritize environment variables over file config", async () => {
      const configFile = join(testDir, ".ga4rc.json");
      await writeFile(
        configFile,
        JSON.stringify({
          ga4PropertyId: "111111111",
          defaultComparisonPeriod: "previous_day",
        }),
      );

      process.env.GA4_PROPERTY_ID = "999999999";
      process.env.GA4_DEFAULT_COMPARISON = "previous_week";

      const config = await loader.load();

      expect(config.ga4PropertyId).toBe("999999999");
      expect(config.defaultComparisonPeriod).toBe("previous_week");
    });
  });

  describe("正常系: デフォルト値", () => {
    it("should apply default values when not specified", async () => {
      process.env.GA4_PROPERTY_ID = "123456789";
      process.env.GA4_SERVICE_ACCOUNT_KEY = "/path/to/key.json";

      const config = await loader.load();

      expect(config.defaultComparisonPeriod).toBe("previous_day");
      expect(config.verbose).toBe(false);
      expect(config.enableGSC).toBe(false);
    });
  });

  describe("異常系: バリデーションエラー", () => {
    it("should throw ConfigurationError when property ID is missing", async () => {
      // 環境変数をクリア
      delete process.env.GA4_PROPERTY_ID;
      delete process.env.GA4_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // ホームディレクトリのモック
      vi.spyOn(process.env, "HOME", "get").mockReturnValue(testDir);

      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow("ga4PropertyId");
    });

    it("should throw ConfigurationError when property ID is not numeric", async () => {
      process.env.GA4_PROPERTY_ID = "invalid-id";

      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow("数値である必要があります");
    });

    it("should throw ConfigurationError when property ID is empty", async () => {
      // 環境変数をクリア
      delete process.env.GA4_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GA4_PROPERTY_ID = "";

      // ホームディレクトリのモック
      vi.spyOn(process.env, "HOME", "get").mockReturnValue(testDir);

      await expect(loader.load()).rejects.toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError for invalid comparison period", async () => {
      process.env.GA4_PROPERTY_ID = "123456789";
      process.env.GA4_DEFAULT_COMPARISON = "invalid_period";

      await expect(loader.load()).rejects.toThrow(ConfigurationError);
    });
  });

  describe("validate() メソッド", () => {
    it("should return valid result for correct configuration", async () => {
      const keyFile = join(testDir, "key.json");
      await writeFile(keyFile, JSON.stringify({ test: "data" }));

      const config = {
        ga4PropertyId: "123456789",
        serviceAccountKeyPath: keyFile,
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: false,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error when property ID is missing", async () => {
      const config = {
        ga4PropertyId: "",
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: false,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("GA4 Property IDが設定されていません");
    });

    it("should return error when service account key file does not exist", async () => {
      const config = {
        ga4PropertyId: "123456789",
        serviceAccountKeyPath: "/nonexistent/key.json",
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: false,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("見つかりません"))).toBe(
        true,
      );
    });

    it("should return error when no authentication is configured", async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      const config = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: false,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("認証情報が設定されていません")),
      ).toBe(true);
    });

    it("should return error when GSC is enabled without site URL", async () => {
      const config = {
        ga4PropertyId: "123456789",
        serviceAccountKeyPath: "/path/to/key.json",
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: true,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("gscSiteUrl"))).toBe(true);
    });

    it("should pass validation when using GOOGLE_APPLICATION_CREDENTIALS", async () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/gcp-key.json";

      const config = {
        ga4PropertyId: "123456789",
        defaultComparisonPeriod: "previous_day" as const,
        verbose: false,
        enableGSC: false,
      };

      const result = await loader.validate(config);

      expect(result.isValid).toBe(true);
    });
  });

  describe("境界値テスト", () => {
    it("should handle very long property ID", async () => {
      const longId = "1".repeat(100);
      process.env.GA4_PROPERTY_ID = longId;

      const config = await loader.load();

      expect(config.ga4PropertyId).toBe(longId);
    });

    it("should handle property ID with leading zeros", async () => {
      process.env.GA4_PROPERTY_ID = "000123456";

      const config = await loader.load();

      expect(config.ga4PropertyId).toBe("000123456");
    });

    it("should convert relative path to absolute path", async () => {
      const configPath = join(testDir, ".ga4rc.json");

      // テスト用設定ファイルを作成
      await writeFile(
        configPath,
        JSON.stringify({
          ga4PropertyId: "123456789",
          serviceAccountKeyPath: "./service-account.json",
        }),
      );

      // テスト用サービスアカウントファイルを作成
      await writeFile(join(testDir, "service-account.json"), "{}");

      const config = await loader.load();

      // 絶対パスに変換されていることを確認（パスの最後の部分をチェック）
      expect(config.serviceAccountKeyPath).toContain("service-account.json");
      expect(config.serviceAccountKeyPath?.startsWith("/")).toBe(true);
    });

    it("should keep absolute path unchanged", async () => {
      const absolutePath = "/absolute/path/to/key.json";
      const configPath = join(testDir, ".ga4rc.json");

      await writeFile(
        configPath,
        JSON.stringify({
          ga4PropertyId: "123456789",
          serviceAccountKeyPath: absolutePath,
        }),
      );

      const config = await loader.load();

      expect(config.serviceAccountKeyPath).toBe(absolutePath);
    });
  });
});
