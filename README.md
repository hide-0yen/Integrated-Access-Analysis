# GA4 + GSC Integrated Access Analysis MCP Server

> GA4とGoogle Search Consoleのデータを統合分析し、自然言語でインサイトを提供するMCPサーバー

## 概要

「3/3のアクセス増の要因を教えて」のような自然言語クエリを入力すると、GA4のサイト内行動データとGSCの検索流入データを統合分析し、具体的な要因を自然言語で返却します。

### 主な特徴

- 🔍 **自然言語クエリ**: 日付や分析タイプを自然な日本語で指定
- 🔌 **MCPサーバー対応**: Claude Code MAXプラン内で追加料金なしに使用可能
- 📊 **5軸統合分析**: 参照元/メディア、ページ、デバイス/地域、イベント、検索キーワード
- 🔗 **GA4+GSC統合**: Google検索流入の具体的要因を特定(順位変化、CTR改善等)
- 🚀 **高速並列処理**: 5つのAPI呼び出しを並列実行(12秒以内)
- 🛡️ **Graceful Degradation**: GSC失敗時もGA4分析は継続

### MCPサーバーとして動作

Claude Code内で**追加のAPI料金なし**に使用可能
- Model Context Protocol (MCP)対応
- Claude Code MAXプラン内で完結
- 4つのツール提供: analyze_comparison, analyze_exploratory, check_config, validate_config

## ステータス

**現在の状態**: Phase 3A完了（Production Ready進行中）

- ✅ Phase 0: プロジェクトセットアップ完了
- ✅ Phase 1: GA4 MVP完成
- ✅ Phase 2A: GA4 Multi-Axis完成
- ✅ Phase 2B: GSC統合完成
- 🚧 Phase 3: Production Ready（Phase 3A完了）

## インストール

### 開発版（ローカル）

```bash
# リポジトリをクローン
git clone <repository-url>
cd GA4

# 依存関係をインストール
npm install

# ビルド
npm run build

# グローバルにリンク（オプション）
npm link
```

## セットアップ

### 1. GA4プロパティの準備

1. [Google Analytics](https://analytics.google.com/)にアクセス
2. 分析対象のGA4プロパティを特定
3. プロパティIDをメモ（例: `123456789`）

### 2. サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. **APIとサービス > 認証情報** を開く
4. **認証情報を作成 > サービスアカウント** を選択
5. サービスアカウント名を入力して作成
6. 作成したサービスアカウントをクリック
7. **キー > 鍵を追加 > 新しい鍵を作成** を選択
8. JSON形式を選択してダウンロード
9. ダウンロードしたJSONファイルを安全な場所に保存

### 3. GA4プロパティへの権限付与

1. [Google Analytics](https://analytics.google.com/)にアクセス
2. 対象のGA4プロパティを選択
3. **管理 > プロパティのアクセス管理** を開く
4. **+** ボタンをクリック
5. サービスアカウントのメールアドレスを入力（例: `service-account@project-id.iam.gserviceaccount.com`）
6. 役割を **閲覧者** に設定
7. 追加

### 4. Google Search Console（オプション）

GSCとの統合分析を有効にする場合は追加設定が必要です。

#### 4.1. GSC APIの有効化

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 同じプロジェクトを選択
3. **APIとサービス > ライブラリ** を開く
4. "Google Search Console API" を検索
5. **有効にする** をクリック

#### 4.2. GSCプロパティへの権限付与

1. [Google Search Console](https://search.google.com/search-console)にアクセス
2. 対象のプロパティを選択
3. **設定 > ユーザーと権限** を開く
4. **ユーザーを追加** をクリック
5. サービスアカウントのメールアドレスを入力
6. 権限を **オーナー** または **フル** に設定
7. 追加

### 5. MCPサーバーの設定

プロジェクトルートに `.mcp.json` を作成：

```bash
cd /path/to/GA4
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "ga4-analyzer": {
      "command": "node",
      "args": [
        "/absolute/path/to/GA4/dist/mcp-server.js"
      ],
      "env": {
        "GA4_PROPERTY_ID": "YOUR_GA4_PROPERTY_ID",
        "GA4_SERVICE_ACCOUNT_KEY": "/absolute/path/to/service-account-key.json",
        "GA4_ENABLE_GSC": "true",
        "GA4_GSC_SITE_URL": "https://your-site.com",
        "GA4_MAX_RETRIES": "3",
        "GA4_REQUEST_TIMEOUT": "30000",
        "GA4_DATA_LIMIT": "100"
      }
    }
  }
}
EOF
```

**重要**: `args` と `GA4_SERVICE_ACCOUNT_KEY` は**絶対パス**で指定してください。相対パスは認識されません。

**設定例**（実際のパスに置き換えてください）:
```json
{
  "mcpServers": {
    "ga4-analyzer": {
      "command": "node",
      "args": [
        "/Users/username/projects/GA4/dist/mcp-server.js"
      ],
      "env": {
        "GA4_PROPERTY_ID": "318772207",
        "GA4_SERVICE_ACCOUNT_KEY": "/Users/username/projects/GA4/serviceaccount.json",
        "GA4_ENABLE_GSC": "true",
        "GA4_GSC_SITE_URL": "https://example.com",
        "GA4_MAX_RETRIES": "3",
        "GA4_REQUEST_TIMEOUT": "30000",
        "GA4_DATA_LIMIT": "100"
      }
    }
  }
}
```

**設定項目:**

| 環境変数 | 必須 | デフォルト | 説明 |
|---------|------|-----------|------|
| `GA4_PROPERTY_ID` | ✅ | - | GA4プロパティID |
| `GA4_SERVICE_ACCOUNT_KEY` | ✅ | - | サービスアカウントキーの**絶対パス** |
| `GA4_ENABLE_GSC` | - | `false` | GSC統合を有効化 |
| `GA4_GSC_SITE_URL` | GSC有効時 | - | GSCプロパティのURL |
| `GA4_MAX_RETRIES` | - | `3` | API呼び出しの最大リトライ回数（0-10） |
| `GA4_REQUEST_TIMEOUT` | - | `30000` | リクエストタイムアウト（ms、1000-60000） |
| `GA4_DATA_LIMIT` | - | `100` | 取得データの上限（1-1000） |

詳細なセットアップ手順は [MCPセットアップガイド](.tmp/mcp-setup-guide.md) を参照してください。

### 6. Claude Codeの起動と動作確認

**6.1. Claude Codeを起動**

プロジェクトディレクトリでClaude Codeを起動：

```bash
cd /path/to/GA4
claude
```

**6.2. MCPサーバーの接続確認**

Claude Code内で以下を実行：

```
/status
```

出力の「MCP servers」行に `ga4-analyzer ✔` が表示されることを確認してください：

```
MCP servers: context7 ✔, magic ✔, playwright ✔, ga4-analyzer ✔
```

**6.3. ツールの動作テスト**

Claude Code内で以下のクエリを実行：

```
GA4 Analyzerの設定を確認してください
```

Claude Codeが自動的に `check_config` ツールを使用し、以下の情報を表示します：
- GA4プロパティID
- サービスアカウントキーのパス
- GSC統合設定
- その他の設定値

**6.4. 実際のデータ分析テスト**

```
昨日のアクセス数を分析してください
```

GA4 APIを呼び出し、実際のアクセスデータを取得・分析します。

## 使い方

### MCPサーバーとしての使用

GA4 AnalyzerはModel Context Protocol (MCP)サーバーとして動作します。**Claude Code MAXプラン内で追加のAPI料金なしに**GA4/GSC分析を実行できます。

#### 利用可能なツール

Claude Codeが自動的に適切なツールを選択・実行します：

| ツール名 | 説明 | 使用例 |
|---------|------|--------|
| `analyze_comparison` | 比較分析 | 「昨日のアクセス増の要因を分析」 |
| `analyze_exploratory` | 探索的分析（未実装） | - |
| `check_config` | 設定確認 | 「GA4 Analyzerの設定を確認」 |
| `validate_config` | 設定検証 | 「GA4 Analyzerの設定を検証」 |

#### 使用例

**設定確認:**
```
GA4 Analyzerの設定を確認してください
```

**比較分析:**
```
昨日のアクセス増の要因を分析してください
```

```
2026年3月3日のトラフィックを前日と比較してください
```

**GSC統合分析:**
```
Google検索からの流入で最も増加したページを教えてください
```

```
検索順位の変化がアクセス数に与えた影響を分析してください
```

**期間比較:**
```
先週と比較して今週のトラフィックはどう変化しましたか？
```

#### トラブルシューティング

**MCPサーバーが表示されない**

1. `.mcp.json` のパスが絶対パスになっているか確認
2. JSONの構文エラーがないか確認：
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8')))"
   ```
3. Claude Codeを完全に再起動

**接続エラー**

MCPサーバーを手動で起動してエラー確認：
```bash
cd /path/to/GA4
GA4_PROPERTY_ID="your_property_id" \
GA4_SERVICE_ACCOUNT_KEY="./serviceaccount.json" \
node dist/mcp-server.js

4. **使用方法**

Claude Codeセッション内で自然言語で依頼するだけ：

```
昨日のアクセス増の要因を分析してください
```

Claude Codeが自動的に`analyze_comparison`ツールを使用します。

**提供されるツール:**
- `analyze_comparison` - 比較分析（5軸統合分析）
- `check_config` - 設定確認
- `validate_config` - 設定検証

**メリット:**
- ✅ 追加のAPI料金なし（Claude Code MAXプラン内）
- ✅ 会話コンテキストで追加質問可能
- ✅ 自動的にツールを選択・実行

詳細は [MCPセットアップガイド](.tmp/mcp-setup-guide.md) を参照してください。

- **概要分析**: `トラフィック`, `全体の状況`

## 分析結果の例

### 比較分析の出力

Claude Codeが `analyze_comparison` ツールを使用した結果：

```json
{
  "success": true,
  "data": {
    "targetDate": "2026-03-03",
    "comparisonDate": "2026-03-02",
    "summary": {
      "totalSessions": 1234,
      "change": 123,
      "changeRate": 11.1
    },
    "trafficSources": {
      "increases": [
        {
          "source": "google",
          "medium": "organic",
          "sessions": 650,
          "previousSessions": 500,
          "change": 150,
          "changeRate": 30.0
        }
      ]
    },
    "insights": [
      "検索トラフィックの増加が見られます。SEOの効果が表れている可能性があります。"
    ]
  }
}
```

### 設定確認の出力

Claude Codeが `check_config` ツールを使用した結果：

```json
{
  "success": true,
  "data": {
    "ga4PropertyId": "318772207",
    "serviceAccountKeyPath": "/path/to/serviceaccount.json",
    "enableGSC": true,
    "gscSiteUrl": "https://www.lusic.co.jp",
    "maxRetries": 3,
    "requestTimeout": 30000,
    "dataLimit": 100
  }
}
```

## トラブルシューティング

### 設定エラー

```
❌ 設定エラー
設定ファイルが見つかりません
```

**解決方法:**
1. 環境変数が正しく設定されているか確認
2. `.ga4rc.json` が正しい場所にあるか確認
3. `--check-config` で設定を確認

### 認証エラー

```
❌ 認証エラー
認証に失敗しました
```

**解決方法:**
1. サービスアカウントキーのパスが正しいか確認
2. サービスアカウントにGA4プロパティの閲覧権限があるか確認
3. キーファイルの形式が正しいか確認

### APIクォータ超過

```
❌ APIクォータ超過
GA4 Data APIの利用制限に達しました
```

**解決方法:**
- しばらく時間をおいてから再実行
- 1日あたりのトークン数: 25,000（デフォルト）
- 1時間あたりのトークン数: 5,000（デフォルト）

### ネットワークエラー

```
❌ ネットワークエラー
接続がタイムアウトしました
```

**解決方法:**
1. インターネット接続を確認
2. ファイアウォール設定を確認
3. しばらく待ってから再実行

## パフォーマンスチューニング

### パフォーマンスモニタリング

パフォーマンスメトリクスを収集・分析できます：

```bash
# 環境変数で有効化
export GA4_ENABLE_PERFORMANCE_MONITORING="true"

# 設定ファイルで有効化
{
  "enablePerformanceMonitoring": true
}
```

有効化すると、`--verbose`オプション使用時に詳細なパフォーマンスレポートが出力されます：

```bash
ga4-analyzer "昨日のアクセス" --verbose
```

**出力例**:
```
=== Performance Report ===
Recording Period: 2026-03-04T10:00:00.000Z - 2026-03-04T10:00:15.234Z
Total Duration: 15234ms
Total Operations: 5
Average Memory Usage: 45.23 MB

Operation Statistics:
┌─────────────────────────────────┬───────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Operation                       │ Count │ Avg(ms) │ Min(ms) │ Max(ms) │ P50(ms) │ P95(ms) │ P99(ms) │
├─────────────────────────────────┼───────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ multi-axis-analysis             │     1 │ 12345.0 │ 12345.0 │ 12345.0 │ 12345.0 │ 12345.0 │ 12345.0 │
│ insight-generation              │     1 │  1234.0 │  1234.0 │  1234.0 │  1234.0 │  1234.0 │  1234.0 │
│ config-loading                  │     1 │   234.0 │   234.0 │   234.0 │   234.0 │   234.0 │   234.0 │
│ query-parsing                   │     1 │    12.0 │    12.0 │    12.0 │    12.0 │    12.0 │    12.0 │
└─────────────────────────────────┴───────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Slowest Operation: multi-axis-analysis
Fastest Operation: query-parsing
========================
```

**メトリクス**:
- **Avg**: 平均実行時間
- **Min/Max**: 最小/最大実行時間
- **P50/P95/P99**: パーセンタイル値（中央値、95パーセンタイル、99パーセンタイル）

### API呼び出しの最適化

**リトライ回数の調整:**
```bash
# ネットワークが不安定な環境
export GA4_MAX_RETRIES="5"

# 安定した環境でレイテンシ優先
export GA4_MAX_RETRIES="1"
```

**タイムアウトの調整:**
```bash
# 低速なネットワーク
export GA4_REQUEST_TIMEOUT="60000"  # 60秒

# 高速なネットワーク
export GA4_REQUEST_TIMEOUT="10000"  # 10秒
```

### データ取得量の調整

**大量データ分析:**
```bash
# より詳細な分析（API呼び出し増加）
export GA4_DATA_LIMIT="1000"
```

**高速レスポンス優先:**
```bash
# 最小限のデータ取得
export GA4_DATA_LIMIT="10"
```

### GSC統合のパフォーマンス

GSCを有効にすると追加のAPI呼び出しが発生します：

- **GA4のみ**: 4軸並列分析（約8-10秒）
- **GA4 + GSC**: 5軸並列分析（約12-15秒）

GSCが不要な場合は無効化することでレスポンスが向上します：

```json
{
  "enableGSC": false
}
```

### エラーハンドリングとリトライ戦略

APIエラー時の自動リトライは以下のエラータイプに対応：

- **NetworkError**: リトライ可能（exponential backoff: 1s, 2s, 4s）
- **5xx系エラー**: リトライ可能（サーバー側の一時的な問題）
- **QuotaExceededError**: リトライ不可（即座に失敗）
- **AuthenticationError**: リトライ不可（設定を修正）

カスタムリトライ設定例：

```json
{
  "maxRetries": 5,
  "requestTimeout": 45000
}
```

## エラーハンドリング

### エラータイプと対処法

#### ConfigurationError（設定エラー）
**重要度**: Critical

**原因**:
- 設定ファイルが見つからない
- 環境変数が設定されていない
- 設定値のフォーマットが不正

**対処法**:
```bash
# 設定確認
ga4-analyzer --check-config

# 設定検証
ga4-analyzer --validate-config
```

#### AuthenticationError（認証エラー）
**重要度**: Critical

**原因**:
- サービスアカウントキーが無効
- GA4/GSCプロパティへのアクセス権限がない
- キーファイルのパスが間違っている

**対処法**:
1. サービスアカウントのメールアドレスを確認
2. GA4/GSCプロパティの権限設定を確認
3. キーファイルのパスと内容を確認

#### QuotaExceededError（クォータ超過）
**重要度**: Error

**原因**:
- GA4 Data APIの利用制限を超過
- 短時間に大量のリクエスト

**対処法**:
- しばらく時間をおいてから再実行
- データ取得量を削減（`dataLimit`を小さく）
- バッチ処理の場合は間隔を空ける

#### NetworkError（ネットワークエラー）
**重要度**: Error

**原因**:
- ネットワーク接続の問題
- タイムアウト
- プロキシ設定の問題

**対処法**:
- インターネット接続を確認
- タイムアウト値を増やす（`requestTimeout`）
- リトライ回数を増やす（`maxRetries`）

#### ParseError（クエリ解析エラー）
**重要度**: Warning

**原因**:
- 自然言語クエリの形式が不正
- 日付フォーマットが認識できない

**対処法**:
- サポートされている形式で再入力
- 例: "昨日のアクセス増の要因", "3/3のトラフィック"

### Graceful Degradation

システムは部分的な障害に対して継続動作します：

- **GA4エラー時**: GSCデータのみで分析継続（GSC有効時）
- **GSCエラー時**: GA4データのみで分析継続
- **1軸失敗時**: 他の軸のデータで分析継続（最低1軸成功が必要）

```
例: GSC APIエラー発生
⚠️ GSC initialization failed. Continuing with GA4 only: ...
✓ GA4分析は正常に完了
```

## ライセンス

ISC

## 開発ドキュメント

- [要件定義書](.tmp/requirements.md)
- [設計書](.tmp/design.md)
- [テスト設計書](.tmp/test_design.md)
- [タスクリスト](.tmp/tasks.md)
