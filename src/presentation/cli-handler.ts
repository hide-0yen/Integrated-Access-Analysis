/**
 * CLIHandler
 * コマンドライン引数を解析し、適切なコマンドを実行する
 */

import { Command } from "commander";
import {
  QueryOrchestrator,
  type QueryOptions,
} from "@/application/query-orchestrator";
import { OutputFormatter } from "@/presentation/output-formatter";
import { GA4AnalyzerError } from "@/types/errors";

/**
 * コマンドラインオプションの型定義
 */
interface CLIOptions {
  verbose?: boolean;
  json?: boolean;
  compare?: string;
  checkConfig?: boolean;
  validateConfig?: boolean;
  propertyId?: string;
}

/**
 * CLIHandlerクラス
 */
export class CLIHandler {
  private program: Command;
  private orchestrator: QueryOrchestrator;
  private formatter: OutputFormatter;

  constructor() {
    this.program = new Command();
    this.orchestrator = new QueryOrchestrator();
    this.formatter = new OutputFormatter();
    this.setupCommands();
  }

  /**
   * コマンドをセットアップ
   */
  private setupCommands(): void {
    this.program
      .name("ga4-analyzer")
      .description(
        "GA4 + Google Search Console integrated access analysis CLI tool",
      )
      .version("0.1.0")
      .argument(
        "[query]",
        "Natural language query (e.g., '昨日のアクセス増の要因')",
      )
      .option("-v, --verbose", "Show verbose logging")
      .option("-j, --json", "Output in JSON format")
      .option(
        "-c, --compare <type>",
        "Comparison type (e.g., '前週同日', '前月同日')",
      )
      .option("--check-config", "Check configuration and exit")
      .option("--validate-config", "Validate configuration and exit")
      .option("--property-id <id>", "Override GA4 property ID");
  }

  /**
   * CLIを実行
   */
  async run(argv: string[]): Promise<number> {
    try {
      // コマンドライン引数を解析
      this.program.parse(argv);
      const options = this.program.opts<CLIOptions>();
      const [query] = this.program.args;

      // --check-configオプション
      if (options.checkConfig) {
        return await this.handleCheckConfig();
      }

      // --validate-configオプション
      if (options.validateConfig) {
        return await this.handleValidateConfig();
      }

      // クエリが指定されていない場合
      if (!query) {
        this.program.help();
        return 2;
      }

      // クエリオプションを構築
      const queryOptions: QueryOptions = {
        verbose: options.verbose,
        compareType: options.compare,
        propertyId: options.propertyId,
      };

      // クエリを実行
      const result = await this.orchestrator.execute(query, queryOptions);

      // 結果を出力
      if (options.json) {
        console.log(this.formatter.formatJSON(result));
      } else {
        console.log(this.formatter.formatReport(result));
      }

      return 0;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 設定チェックを処理
   */
  private async handleCheckConfig(): Promise<number> {
    try {
      const config = await this.orchestrator.checkConfig();

      console.log("✅ 設定が正常に読み込まれました\n");
      console.log("GA4 Property ID:", config.ga4PropertyId);
      console.log(
        "Service Account Key Path:",
        config.serviceAccountKeyPath || "(Application Default Credentials)",
      );
      console.log("Default Comparison Period:", config.defaultComparisonPeriod);

      return 0;
    } catch (error) {
      console.error(this.formatter.formatError(error as Error));
      return 1;
    }
  }

  /**
   * 設定検証を処理
   */
  private async handleValidateConfig(): Promise<number> {
    try {
      const validation = await this.orchestrator.validateConfig();

      if (validation.isValid) {
        console.log("✅ 設定は有効です");
        return 0;
      } else {
        console.error("❌ 設定に問題があります\n");
        for (const error of validation.errors) {
          console.error(`  - ${error}`);
        }
        return 1;
      }
    } catch (error) {
      console.error(this.formatter.formatError(error as Error));
      return 1;
    }
  }

  /**
   * エラーを処理
   */
  private handleError(error: unknown): number {
    if (error instanceof GA4AnalyzerError) {
      console.error(this.formatter.formatError(error));
      return 1;
    }

    if (error instanceof Error) {
      console.error(this.formatter.formatError(error));
      return 1;
    }

    console.error("❌ 予期しないエラーが発生しました");
    console.error(error);
    return 1;
  }
}
