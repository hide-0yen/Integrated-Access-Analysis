/**
 * QueryParser
 * 自然言語クエリを解析してParsedQueryに変換する
 */

import { subDays, subMonths, isValid } from "date-fns";
import { ParseError } from "@/types/errors";
import { ParsedQuery, AnalysisType, ComparisonType } from "@/types/models";

/**
 * パースオプション
 */
export interface ParseOptions {
  defaultComparisonType?: ComparisonType;
  referenceDate?: Date; // テスト用(デフォルトは今日)
}

/**
 * 日付パターン
 */
interface DatePattern {
  regex: RegExp;
  type: "absolute" | "relative";
  transform?: (referenceDate: Date, match: RegExpMatchArray) => Date;
}

/**
 * 分析タイプのキーワードマッピング
 */
const ANALYSIS_TYPE_KEYWORDS: Record<AnalysisType, string[]> = {
  increase_factors: ["増", "増加", "伸び", "上昇", "要因"],
  decrease_factors: ["減", "減少", "下落", "低下", "原因"],
  overview: ["概要", "全体", "サマリー", "状況"],
  trend: ["推移", "トレンド", "変化"],
};

/**
 * GA4開始日
 */
const GA4_START_DATE = new Date("2020-01-01T00:00:00.000Z");

/**
 * 日付をUTC 0時0分0秒にリセットする
 */
function toUTCStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  );
}

/**
 * QueryParserクラス
 */
export class QueryParser {
  /**
   * 自然言語クエリをパースする
   */
  parse(rawQuery: string, options?: ParseOptions): ParsedQuery {
    // クエリが空の場合はエラー
    if (!rawQuery || rawQuery.trim().length === 0) {
      throw new ParseError("クエリが空です");
    }

    // クエリが長すぎる場合はエラー
    if (rawQuery.length > 1000) {
      throw new ParseError("クエリが長すぎます");
    }

    const referenceDate = options?.referenceDate || new Date();
    const defaultComparisonType =
      options?.defaultComparisonType || "previous_day";

    // 日付を抽出
    const targetDate = this.extractDate(rawQuery, referenceDate);

    // 分析タイプを推定
    const analysisType = this.detectAnalysisType(rawQuery);

    // 比較日を決定
    const comparisonType = defaultComparisonType;
    const comparisonDate = this.determineComparisonDate(
      targetDate,
      comparisonType,
    );

    return {
      targetDate,
      comparisonDate,
      analysisType,
      comparisonType,
    };
  }

  /**
   * 日付を抽出する
   */
  private extractDate(query: string, referenceDate: Date): Date {
    const patterns: DatePattern[] = [
      // 絶対日付: YYYY-MM-DD
      {
        regex: /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
        type: "absolute",
        transform: (_ref, match) => {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const day = parseInt(match[3], 10);
          return new Date(year, month - 1, day);
        },
      },
      // 月日形式: MM/DD (年は参照日から)
      {
        regex: /(\d{1,2})\/(\d{1,2})/,
        type: "absolute",
        transform: (ref, match) => {
          const month = parseInt(match[1], 10);
          const day = parseInt(match[2], 10);
          const year = ref.getFullYear();
          return new Date(year, month - 1, day);
        },
      },
      // 相対日付: 昨日
      {
        regex: /昨日/,
        type: "relative",
        transform: (ref) => subDays(ref, 1),
      },
      // 相対日付: 今日
      {
        regex: /今日/,
        type: "relative",
        transform: (ref) => ref,
      },
      // 相対日付: N日前
      {
        regex: /(\d+)日前/,
        type: "relative",
        transform: (ref, match) => subDays(ref, parseInt(match[1], 10)),
      },
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern.regex);
      if (match && pattern.transform) {
        const date = pattern.transform(referenceDate, match);

        // 日付の妥当性チェック
        if (!isValid(date)) {
          throw new ParseError("日付形式が不正です");
        }

        // 時刻をリセット(UTCで0時0分0秒にする)
        const normalizedDate = toUTCStartOfDay(date);
        const normalizedRef = toUTCStartOfDay(referenceDate);

        // 未来の日付チェック
        if (normalizedDate > normalizedRef) {
          throw new ParseError("未来の日付は指定できません");
        }

        // GA4開始前の日付チェック
        if (normalizedDate < GA4_START_DATE) {
          throw new ParseError("GA4開始前の日付は指定できません");
        }

        return normalizedDate;
      }
    }

    throw new ParseError("日付を特定できませんでした");
  }

  /**
   * 分析タイプを推定する
   */
  private detectAnalysisType(query: string): AnalysisType {
    for (const [type, keywords] of Object.entries(ANALYSIS_TYPE_KEYWORDS)) {
      if (keywords.some((keyword) => query.includes(keyword))) {
        return type as AnalysisType;
      }
    }
    // デフォルトはoverview
    return "overview";
  }

  /**
   * 比較日を決定する
   */
  private determineComparisonDate(
    targetDate: Date,
    comparisonType: ComparisonType,
  ): Date {
    switch (comparisonType) {
      case "previous_day":
        return subDays(targetDate, 1);
      case "previous_week":
        return subDays(targetDate, 7);
      case "previous_month":
        return subMonths(targetDate, 1);
      default:
        return subDays(targetDate, 1);
    }
  }
}
