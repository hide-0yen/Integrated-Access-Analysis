/**
 * ExploratoryQueryBuilder
 * RawParsedQueryをParsedExploratoryQueryに変換し、
 * 相対期間を絶対日付に解決し、デフォルト値を補完する
 */

import type {
  RawParsedQuery,
  ParsedExploratoryQuery,
  TimeframeResolved,
  FilterCondition,
  DetectionConfig,
} from "@/domain/types/exploratory-query";

/**
 * ExploratoryQueryBuilder
 */
export class ExploratoryQueryBuilder {
  /**
   * RawParsedQueryをParsedExploratoryQueryに変換
   */
  build(
    raw: RawParsedQuery,
    baseDate: Date = new Date(),
  ): ParsedExploratoryQuery {
    const timeframe = this.resolveTimeframe(raw.timeframe, baseDate);
    const filters = this.buildFilters(raw.filters);
    const detection = this.resolveDetection(raw.detection);
    const metrics = raw.metrics.length > 0 ? raw.metrics : ["sessions"];
    const { needsConfirmation, confirmationPrompts } =
      this.checkConfirmationNeeded(raw, detection);

    return {
      analysisMode: "exploratory",
      timeframe,
      filters,
      metrics,
      detection,
      outputFormat: raw.outputFormat,
      needsConfirmation,
      confirmationPrompts,
    };
  }

  /**
   * Timeframeを解決（相対期間→絶対日付）
   */
  private resolveTimeframe(
    timeframe: RawParsedQuery["timeframe"],
    baseDate: Date,
  ): TimeframeResolved {
    if (timeframe.type === "absolute_range") {
      if (!timeframe.startDate || !timeframe.endDate) {
        throw new Error("absolute_range requires both startDate and endDate");
      }
      return {
        type: "absolute_range",
        startDate: timeframe.startDate,
        endDate: timeframe.endDate,
        expression: timeframe.expression,
      };
    }

    if (timeframe.type === "relative_point") {
      const targetDate = this.calculateRelativeDate(
        baseDate,
        timeframe.relativeValue ?? 1,
        timeframe.relativeUnit ?? "day",
      );
      return {
        type: "relative_point",
        targetDate: this.formatDate(targetDate),
        expression: timeframe.expression,
      };
    }

    // relative_range
    const endDate = baseDate;
    const startDate = this.calculateRelativeDate(
      baseDate,
      timeframe.relativeValue ?? 1,
      timeframe.relativeUnit ?? "month",
    );

    return {
      type: "relative_range",
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      expression: timeframe.expression,
    };
  }

  /**
   * 相対日付を計算
   */
  private calculateRelativeDate(
    baseDate: Date,
    value: number,
    unit: "day" | "week" | "month" | "year",
  ): Date {
    const date = new Date(baseDate);

    switch (unit) {
      case "day":
        date.setDate(date.getDate() - value);
        break;
      case "week":
        date.setDate(date.getDate() - value * 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - value);
        break;
      case "year":
        date.setFullYear(date.getFullYear() - value);
        break;
    }

    return date;
  }

  /**
   * 日付をYYYY-MM-DD形式にフォーマット
   */
  private formatDate(date: Date): string {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * フィルター条件を構築
   */
  private buildFilters(
    rawFilters: RawParsedQuery["filters"],
  ): FilterCondition[] {
    return rawFilters.map((filter) => ({
      dimension: filter.dimension,
      operator: filter.operator,
      value: filter.value,
    }));
  }

  /**
   * Detection設定を解決
   */
  private resolveDetection(
    rawDetection: RawParsedQuery["detection"],
  ): DetectionConfig {
    // basisのデフォルト値を補完
    const basis = rawDetection.basis ?? this.getDefaultBasis(rawDetection.type);

    return {
      type: rawDetection.type,
      basis,
      threshold: rawDetection.threshold,
    };
  }

  /**
   * Detection typeに応じたデフォルトbasisを取得
   */
  private getDefaultBasis(
    detectionType: DetectionConfig["type"],
  ): DetectionConfig["basis"] {
    switch (detectionType) {
      case "growth":
      case "decline":
        return "period_average";
      case "anomaly":
        return "statistical";
      case "threshold":
        return "day_over_day";
      case "none":
        return "unspecified";
    }
  }

  /**
   * ユーザー確認が必要かチェック
   */
  private checkConfirmationNeeded(
    raw: RawParsedQuery,
    detection: DetectionConfig,
  ): { needsConfirmation: boolean; confirmationPrompts: string[] } {
    const prompts: string[] = [];

    // 検出タイプがunspecifiedの場合
    if (detection.type !== "none" && detection.basis === "unspecified") {
      prompts.push(
        "検出基準が明確ではありません。どの基準で検出しますか？ (前日比/期間平均/統計的)",
      );
    }

    // 閾値が未指定の場合
    if (detection.type === "threshold" && detection.threshold === undefined) {
      prompts.push("閾値（変化率%）を指定してください。");
    }

    // メトリクスが未指定の場合
    if (raw.metrics.length === 0) {
      prompts.push(
        "分析対象のメトリクスが不明です。デフォルトで「sessions」を使用します。変更しますか？",
      );
    }

    // フィルターが曖昧な場合（演算子がregexなど）
    const hasRegexFilter = raw.filters.some((f) => f.operator === "regex");
    if (hasRegexFilter) {
      prompts.push(
        "正規表現フィルターが含まれています。パターンを確認してください。",
      );
    }

    return {
      needsConfirmation: prompts.length > 0,
      confirmationPrompts: prompts,
    };
  }
}
