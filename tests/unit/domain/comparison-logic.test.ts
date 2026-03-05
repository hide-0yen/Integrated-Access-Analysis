/**
 * ComparisonLogic Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ComparisonLogic } from "@/domain/comparison-logic";
import type { ComparisonResult } from "@/types/models";

describe("ComparisonLogic", () => {
  let logic: ComparisonLogic;

  beforeEach(() => {
    logic = new ComparisonLogic();
  });

  describe("compare", () => {
    it("増加の場合、正の変化率を計算", () => {
      const current = { label: "test", value: 150 };
      const previous = { label: "test", value: 100 };
      const result = logic.compare(current, previous);

      expect(result.current).toBe(150);
      expect(result.previous).toBe(100);
      expect(result.absoluteChange).toBe(50);
      expect(result.percentChange).toBe(50);
      expect(result.isSignificant).toBe(true);
    });

    it("減少の場合、負の変化率を計算", () => {
      const current = { label: "test", value: 100 };
      const previous = { label: "test", value: 150 };
      const result = logic.compare(current, previous);

      expect(result.current).toBe(100);
      expect(result.previous).toBe(150);
      expect(result.absoluteChange).toBe(-50);
      expect(result.percentChange).toBeCloseTo(-33.33, 1);
      expect(result.isSignificant).toBe(true);
    });

    it("変化なしの場合、0%を計算", () => {
      const current = { label: "test", value: 100 };
      const previous = { label: "test", value: 100 };
      const result = logic.compare(current, previous);

      expect(result.absoluteChange).toBe(0);
      expect(result.percentChange).toBe(0);
      expect(result.isSignificant).toBe(false);
    });

    it("前回値が0の場合、無限大を返す", () => {
      const current = { label: "test", value: 100 };
      const previous = { label: "test", value: 0 };
      const result = logic.compare(current, previous);

      expect(result.percentChange).toBe(Number.POSITIVE_INFINITY);
      expect(result.isSignificant).toBe(true);
    });

    it("前回値が0で現在値も0の場合、0%を返す", () => {
      const current = { label: "test", value: 0 };
      const previous = { label: "test", value: 0 };
      const result = logic.compare(current, previous);

      expect(result.percentChange).toBe(0);
      expect(result.isSignificant).toBe(false);
    });

    it("10%以上の変化は有意と判定", () => {
      expect(
        logic.compare(
          { label: "test", value: 110 },
          { label: "test", value: 100 },
        ).isSignificant,
      ).toBe(true);
      expect(
        logic.compare(
          { label: "test", value: 90 },
          { label: "test", value: 100 },
        ).isSignificant,
      ).toBe(true);
    });

    it("10%未満の変化は有意でないと判定", () => {
      expect(
        logic.compare(
          { label: "test", value: 105 },
          { label: "test", value: 100 },
        ).isSignificant,
      ).toBe(false);
      expect(
        logic.compare(
          { label: "test", value: 95 },
          { label: "test", value: 100 },
        ).isSignificant,
      ).toBe(false);
    });
  });

  describe("filterIncreases", () => {
    let sampleData: ComparisonResult[];

    beforeEach(() => {
      sampleData = [
        {
          label: "増加1",
          current: 150,
          previous: 100,
          absoluteChange: 50,
          percentChange: 50,
          isSignificant: true,
        },
        {
          label: "減少1",
          current: 80,
          previous: 100,
          absoluteChange: -20,
          percentChange: -20,
          isSignificant: true,
        },
        {
          label: "増加2",
          current: 120,
          previous: 100,
          absoluteChange: 20,
          percentChange: 20,
          isSignificant: true,
        },
        {
          label: "変化なし",
          current: 100,
          previous: 100,
          absoluteChange: 0,
          percentChange: 0,
          isSignificant: false,
        },
      ];
    });

    it("増加したアイテムのみをフィルタリング", () => {
      const increases = logic.filterIncreases(sampleData);

      expect(increases).toHaveLength(2);
      expect(increases[0]?.label).toBe("増加1");
      expect(increases[1]?.label).toBe("増加2");
    });

    it("空配列の場合、空配列を返す", () => {
      const increases = logic.filterIncreases([]);
      expect(increases).toHaveLength(0);
    });

    it("すべて減少の場合、空配列を返す", () => {
      const decreaseOnly = sampleData.filter((d) => d.absoluteChange < 0);
      const increases = logic.filterIncreases(decreaseOnly);
      expect(increases).toHaveLength(0);
    });
  });

  describe("filterDecreases", () => {
    let sampleData: ComparisonResult[];

    beforeEach(() => {
      sampleData = [
        {
          label: "増加1",
          current: 150,
          previous: 100,
          absoluteChange: 50,
          percentChange: 50,
          isSignificant: true,
        },
        {
          label: "減少1",
          current: 80,
          previous: 100,
          absoluteChange: -20,
          percentChange: -20,
          isSignificant: true,
        },
        {
          label: "減少2",
          current: 60,
          previous: 100,
          absoluteChange: -40,
          percentChange: -40,
          isSignificant: true,
        },
        {
          label: "変化なし",
          current: 100,
          previous: 100,
          absoluteChange: 0,
          percentChange: 0,
          isSignificant: false,
        },
      ];
    });

    it("減少したアイテムのみをフィルタリング", () => {
      const decreases = logic.filterDecreases(sampleData);

      expect(decreases).toHaveLength(2);
      expect(decreases[0]?.label).toBe("減少1");
      expect(decreases[1]?.label).toBe("減少2");
    });

    it("空配列の場合、空配列を返す", () => {
      const decreases = logic.filterDecreases([]);
      expect(decreases).toHaveLength(0);
    });

    it("すべて増加の場合、空配列を返す", () => {
      const increaseOnly = sampleData.filter((d) => d.absoluteChange > 0);
      const decreases = logic.filterDecreases(increaseOnly);
      expect(decreases).toHaveLength(0);
    });
  });

  describe("topN", () => {
    let sampleData: ComparisonResult[];

    beforeEach(() => {
      sampleData = [
        {
          label: "アイテム1",
          current: 150,
          previous: 100,
          absoluteChange: 50,
          percentChange: 50,
          isSignificant: true,
        },
        {
          label: "アイテム2",
          current: 130,
          previous: 100,
          absoluteChange: 30,
          percentChange: 30,
          isSignificant: true,
        },
        {
          label: "アイテム3",
          current: 180,
          previous: 100,
          absoluteChange: 80,
          percentChange: 80,
          isSignificant: true,
        },
        {
          label: "アイテム4",
          current: 110,
          previous: 100,
          absoluteChange: 10,
          percentChange: 10,
          isSignificant: true,
        },
      ];
    });

    it("変化率の絶対値が大きい順にソート", () => {
      const top3 = logic.topN(sampleData, 3);

      expect(top3).toHaveLength(3);
      expect(top3[0]?.label).toBe("アイテム3"); // 80%
      expect(top3[1]?.label).toBe("アイテム1"); // 50%
      expect(top3[2]?.label).toBe("アイテム2"); // 30%
    });

    it("n=0の場合、空配列を返す", () => {
      const top0 = logic.topN(sampleData, 0);
      expect(top0).toHaveLength(0);
    });

    it("nが配列長より大きい場合、全要素を返す", () => {
      const top10 = logic.topN(sampleData, 10);
      expect(top10).toHaveLength(4);
    });

    it("空配列の場合、空配列を返す", () => {
      const topEmpty = logic.topN([], 3);
      expect(topEmpty).toHaveLength(0);
    });

    it("負の変化率も絶対値でソート", () => {
      const mixedData: ComparisonResult[] = [
        {
          label: "増加50%",
          current: 150,
          previous: 100,
          absoluteChange: 50,
          percentChange: 50,
          isSignificant: true,
        },
        {
          label: "減少60%",
          current: 40,
          previous: 100,
          absoluteChange: -60,
          percentChange: -60,
          isSignificant: true,
        },
        {
          label: "増加30%",
          current: 130,
          previous: 100,
          absoluteChange: 30,
          percentChange: 30,
          isSignificant: true,
        },
      ];

      const top2 = logic.topN(mixedData, 2);

      expect(top2[0]?.label).toBe("減少60%"); // |-60| = 60
      expect(top2[1]?.label).toBe("増加50%"); // |50| = 50
    });
  });

  describe("rankByChange", () => {
    let sampleData: ComparisonResult[];

    beforeEach(() => {
      sampleData = [
        {
          label: "中",
          current: 130,
          previous: 100,
          absoluteChange: 30,
          percentChange: 30,
          isSignificant: true,
        },
        {
          label: "高",
          current: 180,
          previous: 100,
          absoluteChange: 80,
          percentChange: 80,
          isSignificant: true,
        },
        {
          label: "低",
          current: 110,
          previous: 100,
          absoluteChange: 10,
          percentChange: 10,
          isSignificant: true,
        },
      ];
    });

    it("降順にソート", () => {
      const sorted = logic.rankByChange(sampleData);

      expect(sorted[0]?.label).toBe("高");
      expect(sorted[1]?.label).toBe("中");
      expect(sorted[2]?.label).toBe("低");
    });

    it("元の配列を変更しない", () => {
      const original = [...sampleData];
      logic.rankByChange(sampleData);

      expect(sampleData[0]?.label).toBe(original[0]?.label);
    });

    it("空配列の場合、空配列を返す", () => {
      const sorted = logic.rankByChange([]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe("エッジケース", () => {
    it("非常に大きな数値を正しく処理", () => {
      const current = { label: "test", value: 2000000 };
      const previous = { label: "test", value: 1000000 };
      const result = logic.compare(current, previous);

      expect(result.absoluteChange).toBe(1000000);
      expect(result.percentChange).toBe(100);
    });

    it("非常に小さな数値を正しく処理", () => {
      const current = { label: "test", value: 0.2 };
      const previous = { label: "test", value: 0.1 };
      const result = logic.compare(current, previous);

      expect(result.absoluteChange).toBeCloseTo(0.1, 10);
      expect(result.percentChange).toBe(100);
    });

    it("負の数値を正しく処理", () => {
      const current = { label: "test", value: -50 };
      const previous = { label: "test", value: -100 };
      const result = logic.compare(current, previous);

      expect(result.absoluteChange).toBe(50);
      expect(result.percentChange).toBe(-50);
    });
  });
});
