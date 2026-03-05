/**
 * Intent Classification Prompt Template
 * LLMを使用したクエリ解析用のプロンプトテンプレート
 */

import type { RawParsedQuery } from "@/domain/types/exploratory-query";

/**
 * クエリ解析プロンプトを構築
 */
export function buildQueryParsingPrompt(query: string): string {
  return `あなたはGA4アクセス解析の専門家です。ユーザーからの自然言語クエリを分析し、構造化されたJSON形式に変換してください。

# 入力クエリ
${query}

# 出力形式
以下のJSON形式で出力してください。JSONのみを出力し、説明文は含めないでください。

\`\`\`json
{
  "timeframe": {
    "type": "relative_range" | "absolute_range" | "relative_point",
    "expression": "元のクエリから抽出した期間表現",
    "startDate": "YYYY-MM-DD (absolute_rangeの場合)",
    "endDate": "YYYY-MM-DD (absolute_rangeの場合)",
    "relativeValue": 数値 (relative_range/relative_pointの場合),
    "relativeUnit": "day" | "week" | "month" | "year" (relative_range/relative_pointの場合)
  },
  "filters": [
    {
      "dimension": "pagePath" | "sessionSource" | "deviceCategory" など,
      "operator": "equals" | "contains" | "startsWith" | "regex",
      "value": "フィルター値"
    }
  ],
  "metrics": ["sessions", "activeUsers", "bounceRate" など],
  "detection": {
    "type": "growth" | "decline" | "anomaly" | "threshold" | "none",
    "basis": "day_over_day" | "period_average" | "statistical" | "unspecified",
    "threshold": 数値 (thresholdタイプの場合、変化率%)
  },
  "outputFormat": "date_list" | "summary" | "detailed_analysis"
}
\`\`\`

# フィールド説明

## timeframe
- **type**:
  - \`relative_range\`: 相対的な期間（例: "直近1年", "過去3ヶ月"）
  - \`absolute_range\`: 絶対的な期間（例: "2024-01-01から2024-12-31"）
  - \`relative_point\`: 相対的な時点（例: "昨日", "先週"）
- **expression**: クエリ中の期間表現をそのまま抽出
- **startDate/endDate**: absolute_rangeの場合、YYYY-MM-DD形式で指定
- **relativeValue**: 相対期間の数値（例: "直近1年" → 1）
- **relativeUnit**: 相対期間の単位

## filters
- GA4のディメンションに基づくフィルター条件
- 主なディメンション:
  - \`pagePath\`: ページパス（例: "/leasing/"）
  - \`sessionSource\`: セッションソース（例: "google"）
  - \`deviceCategory\`: デバイスカテゴリ（例: "mobile"）
  - \`country\`: 国（例: "Japan"）

## metrics
- 分析対象のメトリクス（デフォルト: ["sessions"]）
- 主なメトリクス:
  - \`sessions\`: セッション数
  - \`activeUsers\`: アクティブユーザー数
  - \`bounceRate\`: 直帰率
  - \`averageSessionDuration\`: 平均セッション時間

## detection
- **type**:
  - \`growth\`: 増加している日付を検出
  - \`decline\`: 減少している日付を検出
  - \`anomaly\`: 異常値を検出
  - \`threshold\`: 閾値を超える日付を検出
  - \`none\`: 検出なし（全データ取得）
- **basis**:
  - \`day_over_day\`: 前日比での判定
  - \`period_average\`: 期間平均との比較
  - \`statistical\`: 統計的手法（2σなど）
  - \`unspecified\`: 未指定（デフォルト: period_average）
- **threshold**: 変化率の閾値（%）

## outputFormat
- \`date_list\`: 日付のリスト形式
- \`summary\`: サマリー形式
- \`detailed_analysis\`: 詳細分析形式

# Few-shot Examples

## Example 1: 期間指定 + フィルター + 増加検出
**Input**: "直近1年で/leasing/のセッションが増えている日付を抽出"

**Output**:
\`\`\`json
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
\`\`\`

## Example 2: 絶対期間 + デバイスフィルター + 減少検出
**Input**: "2024年1月1日から2024年12月31日まで、モバイルからのアクセスが減少した日を教えて"

**Output**:
\`\`\`json
{
  "timeframe": {
    "type": "absolute_range",
    "expression": "2024年1月1日から2024年12月31日まで",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
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
}
\`\`\`

## Example 3: 相対期間 + 閾値検出
**Input**: "過去3ヶ月で、前日比20%以上セッションが増加した日はいつ？"

**Output**:
\`\`\`json
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
    "type": "threshold",
    "basis": "day_over_day",
    "threshold": 20
  },
  "outputFormat": "date_list"
}
\`\`\`

## Example 4: 異常値検出
**Input**: "直近6ヶ月でアクティブユーザー数に異常があった日を抽出"

**Output**:
\`\`\`json
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
\`\`\`

## Example 5: フィルター複数 + サマリー出力
**Input**: "過去1ヶ月で、/products/配下でgoogleから来たセッションの概要を教えて"

**Output**:
\`\`\`json
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
\`\`\`

# 注意事項
- 必ずJSONのみを出力してください
- 日付は必ずYYYY-MM-DD形式で指定してください
- クエリから明示的に読み取れない情報は、合理的なデフォルト値を使用してください
  - metricsが不明な場合: ["sessions"]
  - detection.basisが不明な場合: "period_average"
  - outputFormatが不明な場合: "date_list"
- フィルターのoperatorは、クエリの文脈から適切なものを選択してください
  - "〜のページ" → contains
  - "〜で始まる" → startsWith
  - "正確に〜" → equals

上記のルールに従って、入力クエリを解析してください。`;
}

/**
 * 型チェック用のサンプルレスポンス
 */
export const sampleRawParsedQuery: RawParsedQuery = {
  timeframe: {
    type: "relative_range",
    expression: "直近1年",
    relativeValue: 1,
    relativeUnit: "year",
  },
  filters: [
    {
      dimension: "pagePath",
      operator: "contains",
      value: "/leasing/",
    },
  ],
  metrics: ["sessions"],
  detection: {
    type: "growth",
    basis: "period_average",
  },
  outputFormat: "date_list",
};
