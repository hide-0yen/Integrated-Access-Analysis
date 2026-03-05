import { describe, it, expect, beforeEach } from "vitest";
import { ExploratoryQueryBuilder } from "@/domain/exploratory-query-builder";
import type { RawParsedQuery } from "@/domain/types/exploratory-query";

describe("ExploratoryQueryBuilder", () => {
  let builder: ExploratoryQueryBuilder;
  let baseDate: Date;

  beforeEach(() => {
    builder = new ExploratoryQueryBuilder();
    // テスト用の基準日: 2024-12-31
    baseDate = new Date("2024-12-31T00:00:00Z");
  });

  describe("Timeframe解決 - relative_range", () => {
    it("直近1年を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "直近1年",
          relativeValue: 1,
          relativeUnit: "year",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_range");
      if (result.timeframe.type === "relative_range") {
        expect(result.timeframe.startDate).toBe("2023-12-31");
        expect(result.timeframe.endDate).toBe("2024-12-31");
      }
    });

    it("過去3ヶ月を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去3ヶ月",
          relativeValue: 3,
          relativeUnit: "month",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_range");
      if (result.timeframe.type === "relative_range") {
        expect(result.timeframe.startDate).toBe("2024-10-01");
        expect(result.timeframe.endDate).toBe("2024-12-31");
      }
    });

    it("過去2週間を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去2週間",
          relativeValue: 2,
          relativeUnit: "week",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_range");
      if (result.timeframe.type === "relative_range") {
        expect(result.timeframe.startDate).toBe("2024-12-17");
        expect(result.timeframe.endDate).toBe("2024-12-31");
      }
    });

    it("過去7日を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去7日",
          relativeValue: 7,
          relativeUnit: "day",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_range");
      if (result.timeframe.type === "relative_range") {
        expect(result.timeframe.startDate).toBe("2024-12-24");
        expect(result.timeframe.endDate).toBe("2024-12-31");
      }
    });
  });

  describe("Timeframe解決 - absolute_range", () => {
    it("絶対期間を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "absolute_range",
          expression: "2024年1月1日から2024年12月31日まで",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "decline", basis: "day_over_day" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("absolute_range");
      if (result.timeframe.type === "absolute_range") {
        expect(result.timeframe.startDate).toBe("2024-01-01");
        expect(result.timeframe.endDate).toBe("2024-12-31");
      }
    });

    it("startDateが欠落している場合エラーを投げる", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "absolute_range",
          expression: "2024年",
          endDate: "2024-12-31",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
      };

      expect(() => builder.build(raw, baseDate)).toThrow(
        "absolute_range requires both startDate and endDate",
      );
    });
  });

  describe("Timeframe解決 - relative_point", () => {
    it("昨日を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_point",
          expression: "昨日",
          relativeValue: 1,
          relativeUnit: "day",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_point");
      if (result.timeframe.type === "relative_point") {
        expect(result.timeframe.targetDate).toBe("2024-12-30");
      }
    });

    it("先週を正しく解決する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_point",
          expression: "先週",
          relativeValue: 1,
          relativeUnit: "week",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
      };

      const result = builder.build(raw, baseDate);

      expect(result.timeframe.type).toBe("relative_point");
      if (result.timeframe.type === "relative_point") {
        expect(result.timeframe.targetDate).toBe("2024-12-24");
      }
    });
  });

  describe("デフォルト値補完", () => {
    it('metricsが空の場合、デフォルトで["sessions"]を使用する', () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [],
        metrics: [],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.metrics).toEqual(["sessions"]);
    });

    it("detection.basisが未指定の場合、適切なデフォルト値を使用する", () => {
      const rawGrowth: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth" },
        outputFormat: "date_list",
      };

      const resultGrowth = builder.build(rawGrowth, baseDate);
      expect(resultGrowth.detection.basis).toBe("period_average");

      const rawAnomaly: RawParsedQuery = {
        ...rawGrowth,
        detection: { type: "anomaly" },
      };

      const resultAnomaly = builder.build(rawAnomaly, baseDate);
      expect(resultAnomaly.detection.basis).toBe("statistical");

      const rawThreshold: RawParsedQuery = {
        ...rawGrowth,
        detection: { type: "threshold", threshold: 20 },
      };

      const resultThreshold = builder.build(rawThreshold, baseDate);
      expect(resultThreshold.detection.basis).toBe("day_over_day");
    });
  });

  describe("確認必要性判定", () => {
    it("検出基準が不明な場合、確認が必要", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "unspecified" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationPrompts).toContain(
        "検出基準が明確ではありません。どの基準で検出しますか？ (前日比/期間平均/統計的)",
      );
    });

    it("閾値が未指定の場合、確認が必要", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "threshold" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationPrompts).toContain(
        "閾値（変化率%）を指定してください。",
      );
    });

    it("正規表現フィルターが含まれる場合、確認が必要", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [
          {
            dimension: "pagePath",
            operator: "regex",
            value: "^/products/.*",
          },
        ],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationPrompts).toContain(
        "正規表現フィルターが含まれています。パターンを確認してください。",
      );
    });

    it("全てが明確な場合、確認は不要", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [
          {
            dimension: "pagePath",
            operator: "contains",
            value: "/products/",
          },
        ],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.needsConfirmation).toBe(false);
      expect(result.confirmationPrompts).toHaveLength(0);
    });
  });

  describe("フィルター構築", () => {
    it("単一フィルターを正しく構築する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [
          {
            dimension: "pagePath",
            operator: "contains",
            value: "/leasing/",
          },
        ],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].dimension).toBe("pagePath");
      expect(result.filters[0].operator).toBe("contains");
      expect(result.filters[0].value).toBe("/leasing/");
    });

    it("複数フィルターを正しく構築する", () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [
          {
            dimension: "pagePath",
            operator: "startsWith",
            value: "/products/",
          },
          {
            dimension: "sessionSource",
            operator: "equals",
            value: "google",
          },
        ],
        metrics: ["sessions"],
        detection: { type: "none" },
        outputFormat: "summary",
      };

      const result = builder.build(raw, baseDate);

      expect(result.filters).toHaveLength(2);
      expect(result.filters[0].operator).toBe("startsWith");
      expect(result.filters[1].dimension).toBe("sessionSource");
    });
  });

  describe("analysisMode", () => {
    it('常に"exploratory"を設定する', () => {
      const raw: RawParsedQuery = {
        timeframe: {
          type: "relative_range",
          expression: "過去1ヶ月",
          relativeValue: 1,
          relativeUnit: "month",
        },
        filters: [],
        metrics: ["sessions"],
        detection: { type: "growth", basis: "period_average" },
        outputFormat: "date_list",
      };

      const result = builder.build(raw, baseDate);

      expect(result.analysisMode).toBe("exploratory");
    });
  });
});
