/**
 * OutputFormatter
 * 分析結果を見やすい形式でフォーマットする
 */

import type { IntegratedAnalysisResult } from "@/application/insight-generator";
import type { ExploratoryAnalysisResult } from "@/application/exploratory-analysis-orchestrator";
import {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "@/types/errors";

/**
 * OutputFormatterクラス
 */
export class OutputFormatter {
  /**
   * レポートをフォーマットする
   */
  formatReport(
    result: IntegratedAnalysisResult | ExploratoryAnalysisResult,
  ): string {
    // 探索的分析結果の場合
    if ("detections" in result) {
      return this.formatExploratoryReport(result);
    }

    // 比較分析結果の場合
    // InsightGeneratorが生成したレポートを取得
    if (result.insights.length > 0) {
      return result.insights[0];
    }

    // insightsが空の場合は基本情報を返す
    return "レポートが生成されませんでした。";
  }

  /**
   * 探索的分析レポートをフォーマットする
   */
  private formatExploratoryReport(result: ExploratoryAnalysisResult): string {
    const lines: string[] = [];

    lines.push("=".repeat(60));
    lines.push("📊 探索的分析レポート");
    lines.push("=".repeat(60));
    lines.push("");

    // クエリ情報
    lines.push("🔍 クエリ情報:");
    lines.push(`  分析モード: ${result.query.analysisMode}`);
    lines.push(`  期間: ${this.formatTimeframe(result.query.timeframe)}`);
    lines.push(`  メトリクス: ${result.query.metrics.join(", ")}`);
    lines.push(
      `  検出タイプ: ${this.translateDetectionType(result.query.detection.type)}`,
    );
    lines.push("");

    // 統計情報
    lines.push("📈 統計情報:");
    lines.push(`  データポイント数: ${String(result.statistics.count)}`);
    lines.push(`  平均値: ${result.statistics.mean.toFixed(2)}`);
    lines.push(`  標準偏差: ${result.statistics.stdDev.toFixed(2)}`);
    lines.push(`  最小値: ${String(result.statistics.min)}`);
    lines.push(`  最大値: ${String(result.statistics.max)}`);
    lines.push(`  中央値: ${result.statistics.median.toFixed(2)}`);
    lines.push("");

    // サマリー
    lines.push("📊 サマリー:");
    lines.push(
      `  総データポイント数: ${String(result.summary.totalDataPoints)}`,
    );
    lines.push(`  検出件数: ${String(result.summary.detectedCount)}`);
    lines.push(`  検出率: ${(result.summary.detectionRate * 100).toFixed(1)}%`);
    lines.push("");

    // 検出結果（TOP 10）
    if (result.detections.length > 0) {
      lines.push("🎯 検出結果 (TOP 10):");
      lines.push("");
      lines.push("日付         | 値      | 変化率    | 理由");
      lines.push("-".repeat(60));

      result.detections.forEach((detection) => {
        const date = detection.date;
        const value = detection.value.toFixed(0).padStart(7);
        const changeRate = detection.changeRate
          ? `${detection.changeRate > 0 ? "+" : ""}${detection.changeRate.toFixed(1)}%`.padStart(
              9,
            )
          : "N/A".padStart(9);
        const reason = detection.reason || "検出";

        lines.push(`${date} | ${value} | ${changeRate} | ${reason}`);
      });
    } else {
      lines.push("検出された結果はありません。");
    }

    lines.push("");
    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  /**
   * Timeframeをフォーマット
   */
  private formatTimeframe(
    timeframe:
      | { type: "absolute_range"; startDate: string; endDate: string }
      | { type: "relative_range"; startDate: string; endDate: string }
      | { type: "relative_point"; targetDate: string },
  ): string {
    if (timeframe.type === "relative_point") {
      return timeframe.targetDate;
    }
    return `${timeframe.startDate} 〜 ${timeframe.endDate}`;
  }

  /**
   * 検出タイプを日本語に翻訳
   */
  private translateDetectionType(
    type: "growth" | "decline" | "anomaly" | "threshold" | "none",
  ): string {
    const translations = {
      growth: "増加検出",
      decline: "減少検出",
      anomaly: "異常値検出",
      threshold: "閾値検出",
      none: "検出なし",
    };
    return translations[type];
  }

  /**
   * エラーをフォーマットする
   */
  formatError(error: Error): string {
    if (error instanceof ConfigurationError) {
      return this.formatConfigurationError(error);
    }

    if (error instanceof AuthenticationError) {
      return this.formatAuthenticationError(error);
    }

    if (error instanceof QuotaExceededError) {
      return this.formatQuotaExceededError(error);
    }

    if (error instanceof NetworkError) {
      return this.formatNetworkError(error);
    }

    if (error instanceof ParseError) {
      return this.formatParseError(error);
    }

    if (error instanceof ApiError) {
      return this.formatApiError(error);
    }

    if (error instanceof GA4AnalyzerError) {
      return this.formatGA4AnalyzerError(error);
    }

    // 一般的なエラー
    return this.formatGenericError(error);
  }

  /**
   * JSON形式でフォーマットする
   */
  formatJSON(
    result: IntegratedAnalysisResult | ExploratoryAnalysisResult,
  ): string {
    // 探索的分析結果の場合
    if ("detections" in result) {
      return JSON.stringify(result, null, 2);
    }

    // 比較分析結果の場合
    // 日付をISO文字列に変換して出力
    const output = {
      query: {
        targetDate: result.query.targetDate.toISOString(),
        comparisonDate: result.query.comparisonDate.toISOString(),
        analysisType: result.query.analysisType,
        comparisonType: result.query.comparisonType,
      },
      summary: result.summary,
      sourceAnalysis: result.sourceAnalysis,
      insights: result.insights,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * 設定エラーをフォーマット
   */
  private formatConfigurationError(error: ConfigurationError): string {
    return `❌ 設定エラー

${error.message}

解決方法:
1. 環境変数を確認してください:
   - GA4_PROPERTY_ID: GA4プロパティID
   - GA4_SERVICE_ACCOUNT_KEY: サービスアカウントキーのパス

2. または、設定ファイルを作成してください:
   ~/.ga4rc.json または .ga4rc.json

設定例:
{
  "ga4PropertyId": "123456789",
  "serviceAccountKeyPath": "/path/to/service-account-key.json",
  "defaultComparisonPeriod": "previous_day"
}

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * 認証エラーをフォーマット
   */
  private formatAuthenticationError(error: AuthenticationError): string {
    return `❌ 認証エラー

${error.message}

考えられる原因:
- サービスアカウントキーのパスが正しくない
- サービスアカウントにGA4プロパティの閲覧権限がない
- サービスアカウントキーの形式が不正

解決方法:
1. GA4管理画面を開く
2. [管理] > [プロパティ設定] > [プロパティのアクセス管理]
3. サービスアカウントのメールアドレスを追加（閲覧者権限）
4. サービスアカウントキーのパスを確認

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * クォータ超過エラーをフォーマット
   */
  private formatQuotaExceededError(error: QuotaExceededError): string {
    return `❌ APIクォータ超過

${error.message}

GA4 Data APIの利用制限に達しました。

対処方法:
- しばらく時間をおいてから再実行してください
- 本日のクォータリセット時刻まで待機してください

クォータ情報:
- 1日あたりのトークン数: 25,000（デフォルト）
- 1時間あたりのトークン数: 5,000（デフォルト）

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * ネットワークエラーをフォーマット
   */
  private formatNetworkError(error: NetworkError): string {
    return `❌ ネットワークエラー

${error.message}

考えられる原因:
- インターネット接続が切断されている
- GA4 APIサーバーが一時的に利用できない
- ファイアウォールやプロキシによる接続ブロック

対処方法:
1. インターネット接続を確認してください
2. しばらく待ってから再実行してください
3. ファイアウォール設定を確認してください

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * パースエラーをフォーマット
   */
  private formatParseError(error: ParseError): string {
    return `❌ クエリ解析エラー

${error.message}

クエリの形式が正しくありません。

使用可能な日付形式:
- 相対日付: "昨日", "今日", "3日前"
- 絶対日付: "2026-03-03", "3/3"

使用例:
- "昨日のアクセス増の要因"
- "3/3のアクセス減の原因"
- "2026-03-15のトラフィック"

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * APIエラーをフォーマット
   */
  private formatApiError(error: ApiError): string {
    return `❌ APIエラー

${error.message}

GA4 APIとの通信中にエラーが発生しました。

対処方法:
1. しばらく待ってから再実行してください
2. GA4プロパティIDが正しいか確認してください
3. それでも解決しない場合は、認証情報を確認してください

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * GA4Analyzerエラーをフォーマット
   */
  private formatGA4AnalyzerError(error: GA4AnalyzerError): string {
    return `❌ エラー

${error.message}

詳細: ${this.getErrorDetails(error)}`;
  }

  /**
   * 一般的なエラーをフォーマット
   */
  private formatGenericError(error: Error): string {
    return `❌ 予期しないエラーが発生しました

${error.message}

このエラーが繰り返し発生する場合は、以下を確認してください:
- 設定が正しいか（--check-config で確認）
- 最新バージョンを使用しているか
- 問題が解決しない場合は、GitHubでissueを作成してください

詳細: ${error.stack || "スタックトレースなし"}`;
  }

  /**
   * エラーの詳細情報を取得
   */
  private getErrorDetails(error: Error): string {
    if (error.cause) {
      if (error.cause instanceof Error) {
        return error.cause.message;
      }
      // プリミティブ型の場合は文字列に変換、オブジェクトの場合はJSON.stringify()
      if (typeof error.cause === "string") {
        return error.cause;
      }
      if (typeof error.cause === "number" || typeof error.cause === "boolean") {
        return String(error.cause);
      }
      // オブジェクト、配列、その他の複雑な型
      try {
        return JSON.stringify(error.cause);
      } catch {
        return "詳細情報を文字列化できませんでした";
      }
    }
    return error.stack || "詳細情報なし";
  }
}
