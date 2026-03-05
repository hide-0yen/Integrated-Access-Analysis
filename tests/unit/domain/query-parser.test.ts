/**
 * QueryParser Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QueryParser } from "@/domain/query-parser";
import { ParseError } from "@/types/errors";

describe("QueryParser", () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe("日付解析", () => {
    it("絶対日付（スラッシュ形式）を正しく解析できる", () => {
      const result = parser.parse("3/3のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
      });
      expect(result.targetDate.getUTCMonth()).toBe(2); // 3月 = 2 (0-indexed)
      expect(result.targetDate.getUTCDate()).toBe(3);
    });

    it("絶対日付(ハイフン形式)を正しく解析できる", () => {
      const result = parser.parse("2026-03-01のトラフィック", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
      });
      expect(result.targetDate.getUTCFullYear()).toBe(2026);
      expect(result.targetDate.getUTCMonth()).toBe(2);
      expect(result.targetDate.getUTCDate()).toBe(1);
    });

    it("相対日付「昨日」を正しく解析できる", () => {
      const referenceDate = new Date("2026-03-04T00:00:00.000Z");
      const result = parser.parse("昨日のアクセス", { referenceDate });

      expect(result.targetDate.getUTCDate()).toBe(3);
      expect(result.targetDate.getUTCMonth()).toBe(2);
    });

    it("相対日付「今日」を正しく解析できる", () => {
      const referenceDate = new Date("2026-03-04T00:00:00.000Z");
      const result = parser.parse("今日のアクセス", { referenceDate });

      expect(result.targetDate.getUTCDate()).toBe(4);
      expect(result.targetDate.getUTCMonth()).toBe(2);
    });

    it("相対日付「3日前」を正しく解析できる", () => {
      const referenceDate = new Date("2026-03-04T00:00:00.000Z");
      const result = parser.parse("3日前のアクセス", { referenceDate });

      expect(result.targetDate.getUTCDate()).toBe(1);
      expect(result.targetDate.getUTCMonth()).toBe(2);
    });

    it("日付が指定されていない場合はエラーをスロー", () => {
      expect(() => parser.parse("アクセス情報")).toThrow(ParseError);
    });

    it("無効な日付形式の場合はエラーをスロー", () => {
      expect(() => parser.parse("99/99のアクセス")).toThrow(ParseError);
    });
  });

  describe("分析タイプの推定", () => {
    it("「増」「上昇」などのキーワードでincrease_factorsを推定", () => {
      const result = parser.parse("昨日のアクセス増の要因");
      expect(result.analysisType).toBe("increase_factors");
    });

    it("「減」「下降」などのキーワードでdecrease_factorsを推定", () => {
      const result = parser.parse("昨日のアクセス減の原因");
      expect(result.analysisType).toBe("decrease_factors");
    });

    it("増減キーワードがない場合はoverviewを推定", () => {
      const result = parser.parse("昨日のトラフィック");
      expect(result.analysisType).toBe("overview");
    });

    it("「トレンド」キーワードでtrendを推定", () => {
      const result = parser.parse("昨日のトレンド");
      expect(result.analysisType).toBe("trend");
    });
  });

  describe("比較タイプの指定", () => {
    it("オプションでprevious_dayを指定できる", () => {
      const result = parser.parse("昨日のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
        defaultComparisonType: "previous_day",
      });
      expect(result.comparisonType).toBe("previous_day");
    });

    it("オプションでprevious_weekを指定できる", () => {
      const result = parser.parse("昨日のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
        defaultComparisonType: "previous_week",
      });
      expect(result.comparisonType).toBe("previous_week");
    });

    it("オプションでprevious_monthを指定できる", () => {
      const result = parser.parse("昨日のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
        defaultComparisonType: "previous_month",
      });
      expect(result.comparisonType).toBe("previous_month");
    });

    it("デフォルトはprevious_day", () => {
      const result = parser.parse("昨日のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
      });
      expect(result.comparisonType).toBe("previous_day");
    });
  });

  describe("比較日の計算", () => {
    it("previous_dayの場合、対象日の1日前を計算", () => {
      const result = parser.parse("3/3のアクセス", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
      });
      expect(result.comparisonDate.getUTCMonth()).toBe(2);
      expect(result.comparisonDate.getUTCDate()).toBe(2);
    });

    it("previous_weekの場合、対象日の7日前を計算", () => {
      const result = parser.parse("3/10のアクセス", {
        referenceDate: new Date("2026-03-11T00:00:00.000Z"),
        defaultComparisonType: "previous_week",
      });
      expect(result.comparisonDate.getUTCMonth()).toBe(2);
      expect(result.comparisonDate.getUTCDate()).toBe(3);
    });

    it("previous_monthの場合、対象日の1ヶ月前を計算", () => {
      const result = parser.parse("3/15のアクセス", {
        referenceDate: new Date("2026-03-20T00:00:00.000Z"),
        defaultComparisonType: "previous_month",
      });
      expect(result.comparisonDate.getUTCMonth()).toBe(1); // 2月
      expect(result.comparisonDate.getUTCDate()).toBe(15);
    });
  });

  describe("複合ケース", () => {
    it("絶対日付 + 分析タイプ + 比較タイプを正しく解析", () => {
      const result = parser.parse("3/3のアクセス増の要因", {
        referenceDate: new Date("2026-03-04T00:00:00.000Z"),
        defaultComparisonType: "previous_week",
      });

      expect(result.targetDate.getUTCMonth()).toBe(2);
      expect(result.targetDate.getUTCDate()).toBe(3);
      expect(result.analysisType).toBe("increase_factors");
      expect(result.comparisonType).toBe("previous_week");
      expect(result.comparisonDate.getUTCDate()).toBe(24); // 2/24
    });

    it("相対日付 + 分析タイプを正しく解析", () => {
      const referenceDate = new Date("2026-03-04T00:00:00.000Z");
      const result = parser.parse("昨日のアクセス減の原因", { referenceDate });

      expect(result.targetDate.getUTCDate()).toBe(3);
      expect(result.analysisType).toBe("decrease_factors");
      expect(result.comparisonType).toBe("previous_day");
    });
  });

  describe("エッジケース", () => {
    it("空文字列の場合はエラーをスロー", () => {
      expect(() => parser.parse("")).toThrow(ParseError);
    });

    it("null/undefinedの場合はエラーをスロー", () => {
      expect(() => parser.parse(null as unknown as string)).toThrow();
      expect(() => parser.parse(undefined as unknown as string)).toThrow();
    });

    it("月末日付の前月計算を正しく処理", () => {
      // 3/31の前月は2/28または2/29になるべき
      const result = parser.parse("3/31のアクセス", {
        referenceDate: new Date("2026-04-01T00:00:00.000Z"),
        defaultComparisonType: "previous_month",
      });

      expect(result.comparisonDate.getUTCMonth()).toBe(1); // 2月
      // 2026年は閏年ではない
      expect(result.comparisonDate.getUTCDate()).toBe(28);
    });

    it("年をまたぐ前月計算を正しく処理", () => {
      const result = parser.parse("2026-01-15のアクセス", {
        referenceDate: new Date("2026-01-20T00:00:00.000Z"),
        defaultComparisonType: "previous_month",
      });

      expect(result.comparisonDate.getUTCFullYear()).toBe(2025);
      expect(result.comparisonDate.getUTCMonth()).toBe(11); // 12月
      expect(result.comparisonDate.getUTCDate()).toBe(15);
    });
  });
});
