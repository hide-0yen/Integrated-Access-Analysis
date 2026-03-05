/**
 * クエリタイプ
 */
export type QueryType = "comparison" | "exploratory";

/**
 * クエリ分類結果
 */
export interface QueryClassification {
  type: QueryType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
}

/**
 * QueryRouter
 *
 * 自然言語クエリを「比較分析」と「探索的分析」に分類する
 */
export class QueryRouter {
  /**
   * クエリを分類する
   */
  classify(query: string): QueryClassification {
    const exploratoryPatterns = [
      /直近\d+[日週月年]/,
      /過去\d+[日週月年]/,
      /増えている(日付|時期)/,
      /減っている(日付|時期)/,
      /抽出/,
      /リスト/,
      /一覧/,
    ];

    const comparisonPatterns = [
      /昨日/,
      /今日/,
      /\d+日前/,
      /(増|減)の要因/,
      /比較/,
      /なぜ/,
      /理由/,
    ];

    const hasExploratoryPattern = exploratoryPatterns.some((p) =>
      p.test(query),
    );
    const hasComparisonPattern = comparisonPatterns.some((p) => p.test(query));

    if (hasExploratoryPattern && !hasComparisonPattern) {
      return {
        type: "exploratory",
        confidence: 0.9,
        reasoning: "期間指定または検出表現を含む探索的クエリ",
      };
    }

    if (hasComparisonPattern && !hasExploratoryPattern) {
      return {
        type: "comparison",
        confidence: 0.9,
        reasoning: "単一日付比較パターンに一致",
      };
    }

    if (hasExploratoryPattern && hasComparisonPattern) {
      return {
        type: "exploratory",
        confidence: 0.6,
        reasoning: "両パターンを含む、探索的と推定",
      };
    }

    return {
      type: "exploratory",
      confidence: 0.5,
      reasoning: "パターンマッチング不明確、LLMで判定",
    };
  }
}
