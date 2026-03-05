import { describe, it, expect } from "vitest";
import { QueryRouter } from "@/domain/query-router";

describe("QueryRouter", () => {
  const router = new QueryRouter();

  describe("探索的クエリの検出", () => {
    it("「直近1年」を含むクエリを探索的と分類", () => {
      const result = router.classify(
        "直近1年で/leasing/のセッションが増えている日付を抽出",
      );
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("「過去30日」を含むクエリを探索的と分類", () => {
      const result = router.classify("過去30日でPVが増えている時期");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("「抽出」を含むクエリを探索的と分類", () => {
      const result = router.classify(
        "セッションが減っている日付を抽出してください",
      );
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("「リスト」を含むクエリを探索的と分類", () => {
      const result = router.classify("アクセスが多い日のリストを表示");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("「一覧」を含むクエリを探索的と分類", () => {
      const result = router.classify("直近1週間のトラフィック一覧");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("比較クエリの検出", () => {
    it("「昨日」を含むクエリを比較と分類", () => {
      const result = router.classify("昨日のアクセス増の要因");
      expect(result.type).toBe("comparison");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("「今日」を含むクエリを比較と分類", () => {
      const result = router.classify("今日のトラフィックを分析");
      expect(result.type).toBe("comparison");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("「要因」を含むクエリを比較と分類", () => {
      const result = router.classify("アクセス減の要因を教えて");
      expect(result.type).toBe("comparison");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("境界値ケース", () => {
    it("両パターンを含むクエリは探索的と分類", () => {
      const result = router.classify("昨日から直近1週間の増加要因");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("パターンに一致しないクエリは探索的（LLM判定）", () => {
      const result = router.classify("トラフィックの状況を確認");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBe(0.5);
      expect(result.reasoning).toContain("LLM");
    });

    it("空文字列は探索的（LLM判定）", () => {
      const result = router.classify("");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBe(0.5);
    });

    it("数字のみのクエリは探索的（LLM判定）", () => {
      const result = router.classify("123");
      expect(result.type).toBe("exploratory");
      expect(result.confidence).toBe(0.5);
    });
  });
});
