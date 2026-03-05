/**
 * InsightGenerator
 * 分析結果を自然言語レポートに変換する
 */

import type {
  SourceAnalysisResult,
  PageAnalysisResult,
  DeviceLocationAnalysisResult,
  EventAnalysisResult,
  SearchKeywordAnalysisResult,
  CorrelationAnalysisResult,
} from "@/application/analysis-engine";
import type { ParsedQuery } from "@/types/models";

/**
 * 統合分析結果(Multi-Axis版: 5軸 - GA4 4軸 + GSC 1軸 + 相関分析)
 */
export interface IntegratedAnalysisResult {
  query: ParsedQuery;
  summary: SummaryMetrics;
  sourceAnalysis?: SourceAnalysisResult;
  pageAnalysis?: PageAnalysisResult;
  deviceLocationAnalysis?: DeviceLocationAnalysisResult;
  eventAnalysis?: EventAnalysisResult;
  searchKeywordAnalysis?: SearchKeywordAnalysisResult;
  correlationAnalysis?: CorrelationAnalysisResult;
  insights: string[];
}

/**
 * サマリーメトリクス
 */
export interface SummaryMetrics {
  currentTotalSessions: number;
  previousTotalSessions: number;
  absoluteChange: number;
  percentChange: number;
}

/**
 * 主要変化
 */
export interface KeyChange {
  category: "source" | "page" | "device_location" | "event" | "search_keyword";
  item: string;
  metric: string;
  change: number;
  changePercent: number;
  significance: "high" | "medium" | "low";
  // GSC専用フィールド
  positionChange?: number;
  ctrChange?: number;
}

/**
 * InsightGeneratorクラス
 */
export class InsightGenerator {
  /**
   * レポートを生成する
   */
  generate(analysis: IntegratedAnalysisResult): string {
    const {
      query,
      summary,
      sourceAnalysis,
      pageAnalysis,
      deviceLocationAnalysis,
      eventAnalysis,
      searchKeywordAnalysis,
      correlationAnalysis,
    } = analysis;

    // データが空の場合
    if (
      !sourceAnalysis &&
      !pageAnalysis &&
      !deviceLocationAnalysis &&
      !eventAnalysis &&
      !searchKeywordAnalysis
    ) {
      return this.generateEmptyReport();
    }

    // いずれかの軸にデータがあればレポート生成可能
    const hasData =
      (sourceAnalysis &&
        (sourceAnalysis.sources.length > 0 ||
          sourceAnalysis.topGainers.length > 0 ||
          sourceAnalysis.topLosers.length > 0)) ||
      (pageAnalysis &&
        (pageAnalysis.pages.length > 0 ||
          pageAnalysis.topGainers.length > 0 ||
          pageAnalysis.topLosers.length > 0)) ||
      (deviceLocationAnalysis &&
        (deviceLocationAnalysis.deviceLocations.length > 0 ||
          deviceLocationAnalysis.topGainers.length > 0 ||
          deviceLocationAnalysis.topLosers.length > 0)) ||
      (eventAnalysis &&
        (eventAnalysis.events.length > 0 ||
          eventAnalysis.topGainers.length > 0 ||
          eventAnalysis.topLosers.length > 0)) ||
      (searchKeywordAnalysis &&
        (searchKeywordAnalysis.keywords.length > 0 ||
          searchKeywordAnalysis.topGainers.length > 0 ||
          searchKeywordAnalysis.topLosers.length > 0));

    if (!hasData) {
      return this.generateEmptyReport();
    }

    // 日付フォーマット
    const targetDate = this.formatDate(query.targetDate);
    const comparisonDate = this.formatDate(query.comparisonDate);
    const comparisonLabel = this.getComparisonLabel(query.comparisonType);

    // サマリー行
    const summaryLine = this.generateSummaryLine(summary, comparisonLabel);

    // 主要変化の抽出
    const keyChanges = this.identifyKeyChanges(analysis);

    // 変化の要因セクション
    const changesSection = this.generateChangesSection(
      keyChanges,
      query.analysisType,
    );

    // 推察セクション
    const hypotheses = this.generateHypotheses(keyChanges);
    const hypothesesSection =
      hypotheses.length > 0
        ? `\n【推察】\n${hypotheses.join("\n")}`
        : "\n【推察】\n大きな変化は見られませんでした。";

    // 相関分析セクション(オプション)
    const correlationSection = correlationAnalysis
      ? this.generateCorrelationSection(correlationAnalysis)
      : "";

    return `【対象日: ${targetDate} vs 比較日: ${comparisonDate}】

${summaryLine}
${changesSection}${hypothesesSection}${correlationSection}`;
  }

  /**
   * 主要変化を特定する
   */
  identifyKeyChanges(analysis: IntegratedAnalysisResult): KeyChange[] {
    const changes: KeyChange[] = [];

    // 参照元/メディア分析
    if (analysis.sourceAnalysis) {
      for (const source of analysis.sourceAnalysis.topGainers) {
        changes.push({
          category: "source",
          item: `${source.source}/${source.medium}`,
          metric: "sessions",
          change: source.sessionChange,
          changePercent: source.sessionChangePercent,
          significance: this.calculateSignificance(source.sessionChangePercent),
        });
      }

      for (const source of analysis.sourceAnalysis.topLosers) {
        changes.push({
          category: "source",
          item: `${source.source}/${source.medium}`,
          metric: "sessions",
          change: source.sessionChange,
          changePercent: source.sessionChangePercent,
          significance: this.calculateSignificance(source.sessionChangePercent),
        });
      }
    }

    // ページ分析
    if (analysis.pageAnalysis) {
      for (const page of analysis.pageAnalysis.topGainers) {
        changes.push({
          category: "page",
          item: page.pagePath,
          metric: "pageViews",
          change: page.pageViewChange,
          changePercent: page.pageViewChangePercent,
          significance: this.calculateSignificance(page.pageViewChangePercent),
        });
      }

      for (const page of analysis.pageAnalysis.topLosers) {
        changes.push({
          category: "page",
          item: page.pagePath,
          metric: "pageViews",
          change: page.pageViewChange,
          changePercent: page.pageViewChangePercent,
          significance: this.calculateSignificance(page.pageViewChangePercent),
        });
      }
    }

    // デバイス/地域分析
    if (analysis.deviceLocationAnalysis) {
      for (const dl of analysis.deviceLocationAnalysis.topGainers) {
        changes.push({
          category: "device_location",
          item: `${dl.deviceCategory} (${dl.country})`,
          metric: "sessions",
          change: dl.sessionChange,
          changePercent: dl.sessionChangePercent,
          significance: this.calculateSignificance(dl.sessionChangePercent),
        });
      }

      for (const dl of analysis.deviceLocationAnalysis.topLosers) {
        changes.push({
          category: "device_location",
          item: `${dl.deviceCategory} (${dl.country})`,
          metric: "sessions",
          change: dl.sessionChange,
          changePercent: dl.sessionChangePercent,
          significance: this.calculateSignificance(dl.sessionChangePercent),
        });
      }
    }

    // イベント分析
    if (analysis.eventAnalysis) {
      for (const event of analysis.eventAnalysis.topGainers) {
        changes.push({
          category: "event",
          item: event.eventName,
          metric: "eventCount",
          change: event.eventCountChange,
          changePercent: event.eventCountChangePercent,
          significance: this.calculateSignificance(
            event.eventCountChangePercent,
          ),
        });
      }

      for (const event of analysis.eventAnalysis.topLosers) {
        changes.push({
          category: "event",
          item: event.eventName,
          metric: "eventCount",
          change: event.eventCountChange,
          changePercent: event.eventCountChangePercent,
          significance: this.calculateSignificance(
            event.eventCountChangePercent,
          ),
        });
      }
    }

    // 検索キーワード分析(GSC)
    if (analysis.searchKeywordAnalysis) {
      for (const keyword of analysis.searchKeywordAnalysis.topGainers) {
        changes.push({
          category: "search_keyword",
          item: keyword.query,
          metric: "clicks",
          change: keyword.clicksChange,
          changePercent: keyword.clicksChangePercent,
          significance: this.calculateSignificance(keyword.clicksChangePercent),
          positionChange: keyword.positionChange,
          ctrChange: keyword.ctrChange,
        });
      }

      for (const keyword of analysis.searchKeywordAnalysis.topLosers) {
        changes.push({
          category: "search_keyword",
          item: keyword.query,
          metric: "clicks",
          change: keyword.clicksChange,
          changePercent: keyword.clicksChangePercent,
          significance: this.calculateSignificance(keyword.clicksChangePercent),
          positionChange: keyword.positionChange,
          ctrChange: keyword.ctrChange,
        });
      }
    }

    return changes;
  }

  /**
   * 推察を生成する
   */
  generateHypotheses(changes: KeyChange[]): string[] {
    const hypotheses: string[] = [];

    // 有意な変化がない場合
    if (changes.length === 0) {
      return [];
    }

    // 検索流入の増加
    const searchIncrease = changes.find(
      (c) =>
        c.item.includes("google/organic") &&
        c.changePercent > 0 &&
        c.significance !== "low",
    );
    if (searchIncrease) {
      hypotheses.push(
        `・検索エンジン経由のアクセスが増加しており、SEO施策の効果が出ている可能性があります(${this.formatPercent(searchIncrease.changePercent)})。`,
      );
    }

    // ダイレクト流入の減少
    const directDecrease = changes.find(
      (c) =>
        c.item.includes("direct") &&
        c.changePercent < 0 &&
        c.significance !== "low",
    );
    if (directDecrease) {
      hypotheses.push(
        `・ダイレクト流入が減少しており、ブックマークや直接URLアクセスが減っている可能性があります(${this.formatPercent(directDecrease.changePercent)})。`,
      );
    }

    // ソーシャル流入の増加
    const socialIncrease = changes.find(
      (c) =>
        c.item.includes("social") &&
        c.changePercent > 0 &&
        c.significance !== "low",
    );
    if (socialIncrease) {
      hypotheses.push(
        `・ソーシャルメディア経由のアクセスが増加しており、SNSでの露出が増えた可能性があります(${this.formatPercent(socialIncrease.changePercent)})。`,
      );
    }

    // リファラルの変化
    const referralChange = changes.find(
      (c) => c.item.includes("referral") && c.significance !== "low",
    );
    if (referralChange) {
      const direction = referralChange.changePercent > 0 ? "増加" : "減少";
      hypotheses.push(
        `・外部サイトからの参照が${direction}しています(${this.formatPercent(referralChange.changePercent)})。`,
      );
    }

    // GSC: 検索キーワードのクリック増加と順位上昇
    const keywordWithPositionImprovement = changes.find(
      (c) =>
        c.category === "search_keyword" &&
        c.changePercent > 0 &&
        c.positionChange !== undefined &&
        c.positionChange < 0 &&
        c.significance !== "low",
    );
    if (keywordWithPositionImprovement) {
      hypotheses.push(
        `・"${keywordWithPositionImprovement.item}" のクリック数が増加し、検索順位も上昇しています(${this.formatPercent(keywordWithPositionImprovement.changePercent)})。SEO施策の効果が出ている可能性があります。`,
      );
    }

    // GSC: クリック増加とCTR改善
    const keywordWithCTRImprovement = changes.find(
      (c) =>
        c.category === "search_keyword" &&
        c.changePercent > 0 &&
        c.ctrChange !== undefined &&
        c.ctrChange > 0 &&
        c.significance !== "low",
    );
    if (keywordWithCTRImprovement) {
      hypotheses.push(
        `・"${keywordWithCTRImprovement.item}" のクリック率(CTR)が改善しており、検索結果での訴求力が向上している可能性があります。`,
      );
    }

    // GSC: クリック減少と順位低下
    const keywordWithPositionDrop = changes.find(
      (c) =>
        c.category === "search_keyword" &&
        c.changePercent < 0 &&
        c.positionChange !== undefined &&
        c.positionChange > 0 &&
        c.significance !== "low",
    );
    if (keywordWithPositionDrop) {
      hypotheses.push(
        `・"${keywordWithPositionDrop.item}" のクリック数が減少し、検索順位も低下しています。競合サイトの台頭や検索アルゴリズムの変更の影響を受けている可能性があります。`,
      );
    }

    return hypotheses;
  }

  /**
   * 空のレポートを生成する
   */
  private generateEmptyReport(): string {
    return "データが取得できませんでした。\n設定やAPI接続を確認してください。";
  }

  /**
   * サマリー行を生成する
   */
  private generateSummaryLine(
    summary: SummaryMetrics,
    comparisonLabel: string,
  ): string {
    const current = this.formatNumber(summary.currentTotalSessions);
    const changeSign = summary.absoluteChange >= 0 ? "+" : "";
    const percentSign = summary.percentChange >= 0 ? "+" : "";
    const absolute = this.formatNumber(Math.abs(summary.absoluteChange));
    const percent = this.formatPercent(summary.percentChange);

    return `総アクセス数: ${current} セッション (${comparisonLabel} ${percentSign}${percent}, ${changeSign}${absolute} セッション)`;
  }

  /**
   * 変化の要因セクションを生成する
   */
  private generateChangesSection(
    keyChanges: KeyChange[],
    analysisType: string,
  ): string {
    if (keyChanges.length === 0) {
      return "\n【主な変化要因】\n特に大きな変化は見られませんでした。";
    }

    const direction =
      analysisType === "increase_factors"
        ? "増加"
        : analysisType === "decrease_factors"
          ? "減少"
          : "変化";

    // カテゴリ別にグループ化
    const byCategory = {
      source: keyChanges.filter((c) => c.category === "source"),
      page: keyChanges.filter((c) => c.category === "page"),
      device_location: keyChanges.filter(
        (c) => c.category === "device_location",
      ),
      event: keyChanges.filter((c) => c.category === "event"),
      search_keyword: keyChanges.filter((c) => c.category === "search_keyword"),
    };

    const sections: string[] = [];
    let sectionIndex = 1;

    // 参照元/メディア
    if (byCategory.source.length > 0) {
      const changesText = byCategory.source
        .slice(0, 3)
        .map((change) => {
          const icon = change.changePercent > 0 ? "✓" : "✗";
          const action = change.changePercent > 0 ? "増加" : "減少";
          const changeAbs = this.formatNumber(Math.abs(change.change));
          const changePercent = this.formatPercent(
            Math.abs(change.changePercent),
          );

          return `  ${icon} ${change.item} のセッションが${changePercent} (${change.changePercent > 0 ? "+" : "-"}${changeAbs} セッション)${action}`;
        })
        .join("\n");
      sections.push(`${String(sectionIndex)}. 参照元/メディア\n${changesText}`);
      sectionIndex++;
    }

    // ページ/コンテンツ
    if (byCategory.page.length > 0) {
      const changesText = byCategory.page
        .slice(0, 3)
        .map((change) => {
          const icon = change.changePercent > 0 ? "✓" : "✗";
          const action = change.changePercent > 0 ? "増加" : "減少";
          const changeAbs = this.formatNumber(Math.abs(change.change));
          const changePercent = this.formatPercent(
            Math.abs(change.changePercent),
          );

          return `  ${icon} ${change.item} のPVが${changePercent} (${change.changePercent > 0 ? "+" : "-"}${changeAbs} PV)${action}`;
        })
        .join("\n");
      sections.push(
        `${String(sectionIndex)}. ページ/コンテンツ\n${changesText}`,
      );
      sectionIndex++;
    }

    // デバイス/地域
    if (byCategory.device_location.length > 0) {
      const changesText = byCategory.device_location
        .slice(0, 3)
        .map((change) => {
          const icon = change.changePercent > 0 ? "✓" : "✗";
          const action = change.changePercent > 0 ? "増加" : "減少";
          const changeAbs = this.formatNumber(Math.abs(change.change));
          const changePercent = this.formatPercent(
            Math.abs(change.changePercent),
          );

          return `  ${icon} ${change.item} のセッションが${changePercent} (${change.changePercent > 0 ? "+" : "-"}${changeAbs} セッション)${action}`;
        })
        .join("\n");
      sections.push(`${String(sectionIndex)}. デバイス/地域\n${changesText}`);
      sectionIndex++;
    }

    // イベント
    if (byCategory.event.length > 0) {
      const changesText = byCategory.event
        .slice(0, 3)
        .map((change) => {
          const icon = change.changePercent > 0 ? "✓" : "✗";
          const action = change.changePercent > 0 ? "増加" : "減少";
          const changeAbs = this.formatNumber(Math.abs(change.change));
          const changePercent = this.formatPercent(
            Math.abs(change.changePercent),
          );

          return `  ${icon} ${change.item} イベントが${changePercent} (${change.changePercent > 0 ? "+" : "-"}${changeAbs} 回)${action}`;
        })
        .join("\n");
      sections.push(`${String(sectionIndex)}. イベント\n${changesText}`);
      sectionIndex++;
    }

    // 検索キーワード (GSC)
    if (byCategory.search_keyword.length > 0) {
      const changesText = byCategory.search_keyword
        .slice(0, 3)
        .map((change) => {
          const icon = change.changePercent > 0 ? "✓" : "✗";
          const action = change.changePercent > 0 ? "増加" : "減少";
          const changeAbs = this.formatNumber(Math.abs(change.change));
          const changePercent = this.formatPercent(
            Math.abs(change.changePercent),
          );

          let detailText = `${icon} "${change.item}" のクリック数が${changePercent} (${change.changePercent > 0 ? "+" : "-"}${changeAbs} クリック)${action}`;

          // Add position and CTR changes if available
          if (
            change.positionChange !== undefined &&
            change.positionChange !== 0
          ) {
            const posDirection = change.positionChange < 0 ? "上昇" : "下降";
            detailText += ` (順位${posDirection})`;
          }
          if (change.ctrChange !== undefined && change.ctrChange !== 0) {
            const ctrPercent = (change.ctrChange * 100).toFixed(1);
            detailText += ` (CTR ${change.ctrChange > 0 ? "+" : ""}${ctrPercent}%)`;
          }

          return `  ${detailText}`;
        })
        .join("\n");
      sections.push(
        `${String(sectionIndex)}. 検索キーワード (GSC)\n${changesText}`,
      );
    }

    return `\n【主な${direction}要因】\n${sections.join("\n\n")}`;
  }

  /**
   * 比較タイプのラベルを取得
   */
  private getComparisonLabel(comparisonType: string): string {
    const labels: Record<string, string> = {
      previous_day: "前日比",
      previous_week: "前週比",
      previous_month: "前月比",
      custom: "比較日比",
    };
    return labels[comparisonType] || "比較日比";
  }

  /**
   * 日付をフォーマット
   */
  private formatDate(date: Date): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * 数値をカンマ区切りでフォーマット
   */
  private formatNumber(value: number): string {
    return Math.round(value).toLocaleString("ja-JP");
  }

  /**
   * パーセントをフォーマット
   */
  private formatPercent(value: number): string {
    if (!isFinite(value)) {
      return "∞%";
    }
    return `${value.toFixed(1)}%`;
  }

  /**
   * 有意性を計算
   */
  private calculateSignificance(
    percentChange: number,
  ): "high" | "medium" | "low" {
    const abs = Math.abs(percentChange);
    if (abs >= 50) {
      return "high";
    }
    if (abs >= 20) {
      return "medium";
    }
    return "low";
  }

  /**
   * 相関分析セクションを生成
   */
  private generateCorrelationSection(
    analysis: CorrelationAnalysisResult,
  ): string {
    const correlation = analysis.correlation;

    // セッション変化とクリック変化の概要
    const sessionChangePercent = this.formatPercent(
      correlation.organicSessions.changePercent,
    );
    const clickChangePercent = this.formatPercent(
      correlation.totalClicks.changePercent,
    );

    let overview = `\n【GA4とGSCの相関分析】\n・オーガニック検索セッション: ${sessionChangePercent} (${this.formatNumber(correlation.organicSessions.change)} セッション)`;
    overview += `\n・検索クリック数: ${clickChangePercent} (${this.formatNumber(correlation.totalClicks.change)} クリック)`;
    overview += `\n・クリック→セッション変換率: ${(correlation.clickToSessionRate * 100).toFixed(0)}%`;

    // トップ貢献キーワード
    if (correlation.topContributors.length > 0) {
      overview += "\n\n【セッション増加への主な貢献キーワード】";
      const topThree = correlation.topContributors.slice(0, 3);
      for (const contributor of topThree) {
        overview += `\n  ✓ "${contributor.query}": ${this.formatNumber(contributor.contribution)} セッション寄与 (全体の${contributor.contributionPercent.toFixed(1)}%)`;
      }
    }

    // トップ減少要因キーワード
    if (correlation.topDetractors.length > 0) {
      overview += "\n\n【セッション減少への主な要因キーワード】";
      const topThree = correlation.topDetractors.slice(0, 3);
      for (const detractor of topThree) {
        overview += `\n  ✗ "${detractor.query}": ${this.formatNumber(Math.abs(detractor.contribution))} セッション減少 (全体の${Math.abs(detractor.contributionPercent).toFixed(1)}%)`;
      }
    }

    // インサイト追加
    if (analysis.insights.length > 0) {
      overview += "\n\n【相関分析インサイト】";
      for (const insight of analysis.insights) {
        overview += `\n${insight}`;
      }
    }

    return overview;
  }
}
