import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMQueryParser, LLMParsingError } from "@/domain/llm-query-parser";
import { ClaudeClient } from "@/infrastructure/claude-client";
import type { RawParsedQuery } from "@/domain/types/exploratory-query";

// ClaudeClientをモック化
vi.mock("@/infrastructure/claude-client");

describe("LLMQueryParser", () => {
  let parser: LLMQueryParser;
  let mockClaudeClient: ClaudeClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClaudeClient = new ClaudeClient({ apiKey: "test-key" });
    parser = new LLMQueryParser({ claudeClient: mockClaudeClient });
  });

  describe("正常系 - 期間指定パターン", () => {
    it("相対期間（直近1年）を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "直近1年",
    "relativeValue": 1,
    "relativeUnit": "year"
  },
  "filters": [
    {
      "dimension": "pagePath",
      "operator": "contains",
      "value": "/leasing/"
    }
  ],
  "metrics": ["sessions"],
  "detection": {
    "type": "growth",
    "basis": "period_average"
  },
  "outputFormat": "date_list"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "直近1年で/leasing/のセッションが増えている日付を抽出",
      );

      expect(result.timeframe.type).toBe("relative_range");
      expect(result.timeframe.relativeValue).toBe(1);
      expect(result.timeframe.relativeUnit).toBe("year");
      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].dimension).toBe("pagePath");
      expect(result.detection.type).toBe("growth");
    });

    it("絶対期間を正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "absolute_range",
    "expression": "2024年1月1日から2024年12月31日まで",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "decline",
    "basis": "day_over_day"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "2024年1月1日から2024年12月31日までのセッション減少日",
      );

      expect(result.timeframe.type).toBe("absolute_range");
      expect(result.timeframe.startDate).toBe("2024-01-01");
      expect(result.timeframe.endDate).toBe("2024-12-31");
    });

    it("相対時点（昨日）を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_point",
    "expression": "昨日",
    "relativeValue": 1,
    "relativeUnit": "day"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "summary"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse("昨日のセッション数を教えて");

      expect(result.timeframe.type).toBe("relative_point");
      expect(result.timeframe.relativeValue).toBe(1);
      expect(result.timeframe.relativeUnit).toBe("day");
    });
  });

  describe("正常系 - フィルターパターン", () => {
    it("単一フィルター（contains）を正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去3ヶ月",
    "relativeValue": 3,
    "relativeUnit": "month"
  },
  "filters": [
    {
      "dimension": "pagePath",
      "operator": "contains",
      "value": "/products/"
    }
  ],
  "metrics": ["sessions"],
  "detection": {
    "type": "growth",
    "basis": "period_average"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去3ヶ月で/products/のセッションが増加した日",
      );

      expect(result.filters).toHaveLength(1);
      expect(result.filters[0].operator).toBe("contains");
      expect(result.filters[0].value).toBe("/products/");
    });

    it("複数フィルターを正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去1ヶ月",
    "relativeValue": 1,
    "relativeUnit": "month"
  },
  "filters": [
    {
      "dimension": "pagePath",
      "operator": "startsWith",
      "value": "/products/"
    },
    {
      "dimension": "sessionSource",
      "operator": "equals",
      "value": "google"
    }
  ],
  "metrics": ["sessions"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "summary"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去1ヶ月で/products/配下でgoogleから来たセッションの概要",
      );

      expect(result.filters).toHaveLength(2);
      expect(result.filters[0].operator).toBe("startsWith");
      expect(result.filters[1].dimension).toBe("sessionSource");
    });

    it("デバイスフィルターを正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "直近6ヶ月",
    "relativeValue": 6,
    "relativeUnit": "month"
  },
  "filters": [
    {
      "dimension": "deviceCategory",
      "operator": "equals",
      "value": "mobile"
    }
  ],
  "metrics": ["sessions"],
  "detection": {
    "type": "decline",
    "basis": "day_over_day"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "直近6ヶ月でモバイルからのアクセスが減少した日",
      );

      expect(result.filters[0].dimension).toBe("deviceCategory");
      expect(result.filters[0].value).toBe("mobile");
    });
  });

  describe("正常系 - 検出タイプパターン", () => {
    it("増加検出を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去3ヶ月",
    "relativeValue": 3,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "growth",
    "basis": "period_average"
  },
  "outputFormat": "date_list"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去3ヶ月でセッションが増加した日を抽出",
      );

      expect(result.detection.type).toBe("growth");
      expect(result.detection.basis).toBe("period_average");
    });

    it("減少検出を正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去2ヶ月",
    "relativeValue": 2,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["activeUsers"],
  "detection": {
    "type": "decline",
    "basis": "day_over_day"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去2ヶ月でアクティブユーザー数が減少した日",
      );

      expect(result.detection.type).toBe("decline");
      expect(result.detection.basis).toBe("day_over_day");
    });

    it("異常値検出を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "直近6ヶ月",
    "relativeValue": 6,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["activeUsers"],
  "detection": {
    "type": "anomaly",
    "basis": "statistical"
  },
  "outputFormat": "date_list"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "直近6ヶ月でアクティブユーザー数に異常があった日",
      );

      expect(result.detection.type).toBe("anomaly");
      expect(result.detection.basis).toBe("statistical");
    });

    it("閾値検出を正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去3ヶ月",
    "relativeValue": 3,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "threshold",
    "basis": "day_over_day",
    "threshold": 20
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去3ヶ月で前日比20%以上セッションが増加した日",
      );

      expect(result.detection.type).toBe("threshold");
      expect(result.detection.threshold).toBe(20);
    });

    it("検出なし（全データ取得）を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去1ヶ月",
    "relativeValue": 1,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "summary"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse("過去1ヶ月のセッション数の概要");

      expect(result.detection.type).toBe("none");
    });
  });

  describe("正常系 - メトリクスパターン", () => {
    it("セッション以外のメトリクスを正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去2週間",
    "relativeValue": 2,
    "relativeUnit": "week"
  },
  "filters": [],
  "metrics": ["activeUsers"],
  "detection": {
    "type": "growth",
    "basis": "period_average"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去2週間でアクティブユーザー数が増加した日",
      );

      expect(result.metrics).toEqual(["activeUsers"]);
    });

    it("複数メトリクスを正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去1ヶ月",
    "relativeValue": 1,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions", "activeUsers", "bounceRate"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "detailed_analysis"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse(
        "過去1ヶ月のセッション、アクティブユーザー、直帰率の詳細分析",
      );

      expect(result.metrics).toEqual(["sessions", "activeUsers", "bounceRate"]);
    });
  });

  describe("正常系 - 出力形式パターン", () => {
    it("サマリー形式を正しく解析できる", async () => {
      const mockResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去1ヶ月",
    "relativeValue": 1,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "summary"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse("過去1ヶ月のセッションの概要");

      expect(result.outputFormat).toBe("summary");
    });

    it("詳細分析形式を正しく解析できる", async () => {
      const mockResponse = `\`\`\`json
{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去3ヶ月",
    "relativeValue": 3,
    "relativeUnit": "month"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "none"
  },
  "outputFormat": "detailed_analysis"
}
\`\`\``;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(mockResponse);

      const result = await parser.parse("過去3ヶ月のセッションの詳細分析");

      expect(result.outputFormat).toBe("detailed_analysis");
    });
  });

  describe("異常系 - Claude APIエラー", () => {
    it("Claude APIエラー時にLLMParsingErrorを投げる", async () => {
      vi.spyOn(mockClaudeClient, "sendMessage").mockRejectedValue(
        new Error("Claude API error: 429 - Rate limit exceeded"),
      );

      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        LLMParsingError,
      );
      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        "Failed to parse query with LLM",
      );
    });
  });

  describe("異常系 - JSON抽出失敗", () => {
    it("JSON形式でないレスポンスでエラーを投げる", async () => {
      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(
        "これはJSON形式ではありません",
      );

      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        LLMParsingError,
      );
      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        "Failed to extract JSON from LLM response",
      );
    });
  });

  describe("異常系 - JSONパース失敗", () => {
    it("不正なJSON形式でエラーを投げる", async () => {
      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(
        "```json\n{ invalid json\n```",
      );

      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        LLMParsingError,
      );
    });
  });

  describe("異常系 - Zodバリデーション失敗", () => {
    it("スキーマに適合しないデータでエラーを投げる", async () => {
      const invalidResponse = `{
  "timeframe": {
    "type": "invalid_type",
    "expression": "過去1ヶ月"
  },
  "filters": [],
  "metrics": ["sessions"],
  "detection": {
    "type": "growth"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(
        invalidResponse,
      );

      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        LLMParsingError,
      );
    });

    it("必須フィールドが欠落している場合エラーを投げる", async () => {
      const incompleteResponse = `{
  "timeframe": {
    "type": "relative_range",
    "expression": "過去1ヶ月"
  },
  "filters": [],
  "detection": {
    "type": "growth"
  },
  "outputFormat": "date_list"
}`;

      vi.spyOn(mockClaudeClient, "sendMessage").mockResolvedValue(
        incompleteResponse,
      );

      await expect(parser.parse("テストクエリ")).rejects.toThrow(
        LLMParsingError,
      );
    });
  });

  describe("設定", () => {
    it("フォールバックがデフォルトで有効", () => {
      expect(parser.isFallbackEnabled()).toBe(true);
    });

    it("フォールバックを無効化できる", () => {
      const parserWithoutFallback = new LLMQueryParser({
        claudeClient: mockClaudeClient,
        enableFallback: false,
      });

      expect(parserWithoutFallback.isFallbackEnabled()).toBe(false);
    });
  });
});
