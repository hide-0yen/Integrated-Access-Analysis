# Changelog

All notable changes to GA4 Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Phase 1: BIツール化 - AI駆動探索的分析 ✅

**概要**: LLM（Claude API）を活用した探索的分析機能により、複雑な時系列クエリと異常検出が可能に

##### Phase 1-A: 基盤構築（44 tests）
- **LLM統合型定義**
  - Claude API クライアント (`ClaudeClient`)
  - Zod スキーマバリデーション
  - LLM レスポンス解析ユーティリティ

- **クエリルーティング**
  - `QueryRouter`: パターンベースの分類（探索的 vs 比較分析）
  - 信頼度スコアリングとreasoning

- **探索的クエリ型定義**
  - `RawParsedQuery`: LLM出力の生データ型
  - `ParsedExploratoryQuery`: 解決済みクエリ型
  - `TimeframeResolved`: 期間型（absolute_range/relative_range/relative_point）
  - `DetectionConfig`: 検出設定（growth/decline/anomaly/threshold）

##### Phase 1-B: コア機能（72 tests）
- **LLMクエリパーサー** (`LLMQueryParser`)
  - Claude Haiku モデル統合
  - Few-shot プロンプトテンプレート（5例）
  - JSON schema 定義と抽出
  - Zod による厳密なバリデーション
  - LLM 解析失敗時のエラーハンドリング

- **探索的クエリビルダー** (`ExploratoryQueryBuilder`)
  - 相対期間→絶対日付解決（day/week/month/year単位）
  - デフォルト値補完（metrics: sessions, basis: period_average等）
  - ユーザー確認要否判定
  - フィルター条件構築

- **対話的確認** (`InteractiveConfirmation`)
  - readline ベースの対話インターフェース
  - 検出設定の調整機能
  - 確認プロンプト表示

- **Timeframe分析** (`TimeframeAnalysis`)
  - GA4 データ取得と時系列変換
  - 統計計算（mean, stdDev, min, max, median）
  - メトリクス集計

- **検出ロジック** (`DetectionLogic`)
  - 3つの検出方法:
    - `day_over_day`: 前日比検出
    - `period_average`: 期間平均比検出
    - `statistical`: 統計的異常検出（±2σ）
  - 増加/減少/異常値/閾値検出
  - ランキング機能（変化率/値でソート）
  - TOP N 抽出

##### Phase 1-C: 統合・UX
- **E2Eオーケストレーション** (`ExploratoryAnalysisOrchestrator`)
  - LLMParser → Builder → Confirmation → Analysis → Detection の統合フロー
  - ランキング付き結果取得（TOP N）
  - LLM解析失敗時のフォールバック

- **クエリルーティング統合** (`QueryOrchestrator`)
  - 探索的 vs 比較分析の自動判定
  - Claude API設定チェック
  - 両モードの実行委譲

- **出力フォーマット拡張** (`OutputFormatter`)
  - 探索的分析レポート整形
  - 統計情報表示（平均、標準偏差、中央値等）
  - 検出結果テーブル（日付、値、変化率、理由）
  - JSON出力対応

- **エラーハンドリング**
  - LLM API失敗時の詳細エラーメッセージ
  - Claude API キー未設定検出
  - Graceful degradation

##### 新規コンポーネント
- `src/infrastructure/claude-client.ts`: Claude API統合
- `src/infrastructure/query-templates/intent-classification.ts`: LLMプロンプトテンプレート
- `src/domain/llm-query-parser.ts`: LLMベースのクエリ解析
- `src/domain/exploratory-query-builder.ts`: クエリビルド・期間解決
- `src/domain/query-router.ts`: クエリ分類ルーター
- `src/domain/detection-logic.ts`: 検出アルゴリズム
- `src/presentation/interactive-confirmation.ts`: 対話的確認UI
- `src/application/timeframe-analysis.ts`: 時系列分析エンジン
- `src/application/exploratory-analysis-orchestrator.ts`: E2Eオーケストレーター
- `src/domain/types/exploratory-query.ts`: 型定義

##### テスト
- 17ファイル、89 テストスイート追加
- 探索的分析関連: 72 tests
- 総テスト数: 315 tests（20 files）

##### 設定
- Claude API設定（環境変数 or `.ga4rc.json`）
  - `ANTHROPIC_API_KEY`: Claude APIキー
  - `CLAUDE_MODEL`: モデル選択（デフォルト: claude-3-5-haiku-20241022）
  - `CLAUDE_MAX_TOKENS`: 最大トークン数（デフォルト: 1024）
  - `CLAUDE_TIMEOUT`: タイムアウト（デフォルト: 30000ms）

##### 使用例
```bash
# 期間指定 + フィルター + 増加検出
ga4-analyzer "直近1年で/leasing/のセッションが増えている日付を抽出"

# 絶対期間 + デバイスフィルター + 減少検出
ga4-analyzer "2024年1月1日から2024年12月31日まで、モバイルからのアクセスが減少した日を教えて"

# 相対期間 + 閾値検出
ga4-analyzer "過去3ヶ月で、前日比20%以上セッションが増加した日はいつ？"

# 異常値検出
ga4-analyzer "直近6ヶ月でアクティブユーザー数に異常があった日を抽出"
```

---

- **GA4 and GSC Correlation Analysis** (Task #14) ✅
  - Implemented correlation analysis between GA4 organic search sessions and GSC keyword clicks
  - Click-to-session conversion rate estimation (85%)
  - Keyword contribution analysis with attribution modeling
  - Top contributors/detractors identification
  - Natural language insights for correlation findings
  - Integrated into QueryOrchestrator and InsightGenerator
  - Graceful degradation when correlation data is unavailable

### Planned Features
- CI/CD pipeline with GitHub Actions
- Integration tests with mock APIs
- Performance benchmarking suite

---

## [0.1.0] - 2026-03-04

### Phase 3: Production Ready (Complete)

#### Phase 3A: Essential Items ✅
- **Error Handling Enhancement**
  - Added `ErrorHandler` utility for user-friendly error messages
  - Implemented retry logic with exponential backoff in GA4ApiClient
  - Added error aggregation in QueryOrchestrator
  - Graceful degradation: GSC failures don't stop GA4 analysis

- **Configuration Management**
  - Added GSC configuration options (`enableGSC`, `gscSiteUrl`)
  - Added performance settings (`maxRetries`, `requestTimeout`, `dataLimit`)
  - Enhanced validation with Zod schema
  - Support for environment variables

- **Documentation**
  - Expanded README.md with GSC setup instructions
  - Added performance tuning guide
  - Added troubleshooting section
  - Documented all error types and solutions

#### Phase 3B: Recommended Items ✅
- **Performance Optimization**
  - Implemented `PerformanceMonitor` for metrics collection
  - Added performance reporting with percentiles (P50, P95, P99)
  - Memory usage tracking
  - Operation timing measurement

- **Unit Testing**
  - Created 226 unit tests across 13 test files
  - Achieved 50%+ code coverage
  - Test suites for:
    - QueryParser (date parsing, analysis type inference)
    - ComparisonLogic (comparison calculations, filtering)
    - ErrorHandler (error formatting, severity, retryability)
    - PerformanceMonitor (metrics collection, statistics)
    - AnalysisEngine, InsightGenerator, QueryOrchestrator
    - Infrastructure components (Config, Auth, Clients)

- **Code Quality**
  - Fixed all 47 ESLint errors
  - Enforced strict TypeScript type checking
  - Removed non-null assertions and unsafe type coercions
  - Refactored ErrorHandler to use ES2015 module syntax

- **Documentation**
  - Added CONTRIBUTING.md (architecture, development guide)
  - Added API.md (programmatic usage, type definitions)
  - Added CHANGELOG.md (version history)

### Phase 2B: GSC Integration (2026-02)

#### Added
- **Google Search Console API Integration**
  - `GSCApiClient` for Search Console API access
  - Search keyword analysis with metrics (clicks, impressions, CTR, position)
  - Parallel execution with GA4 analysis (5 axes total)

- **Fifth Analysis Axis**
  - Search keyword performance analysis
  - Click/impression trend comparison
  - CTR and position change tracking
  - Top keywords identification

- **Graceful Degradation**
  - GSC analysis failures don't stop GA4 analysis
  - Clear error reporting for failed analyses
  - Partial results when some axes fail

- **Enhanced Insights**
  - Search query-based insights
  - Correlation between search performance and traffic
  - Keyword opportunity identification

#### Changed
- Extended `InsightGenerator` to include GSC data
- Updated `QueryOrchestrator` for 5-axis parallel processing
- Enhanced error handling for multi-API scenarios

### Phase 2A: GA4 Multi-Axis (2026-01)

#### Added
- **Multi-Axis Analysis**
  - Traffic source analysis (source/medium, sessions, new users)
  - Page analysis (page path, page views, sessions)
  - Device/location analysis (device, country, city, sessions)
  - Event analysis (event name, event count)

- **Parallel Processing**
  - 4 GA4 API calls executed in parallel
  - Analysis completion in under 12 seconds
  - Improved throughput and user experience

- **Advanced Comparison Logic**
  - `ComparisonLogic` class for metric comparisons
  - Ranking by change magnitude
  - Filtering for increases/decreases
  - Significance detection (10%+ threshold)

- **Comprehensive Insights**
  - Multi-dimensional traffic analysis
  - Top performing pages and sources
  - Geographic and device breakdowns
  - Event tracking and trends

#### Changed
- Refactored `AnalysisEngine` for multi-axis support
- Enhanced `InsightGenerator` for richer narratives
- Improved `OutputFormatter` for structured display

### Phase 1: GA4 MVP (2025-12)

#### Added
- **Core Functionality**
  - Natural language query parsing (Japanese)
  - GA4 Data API integration
  - Basic traffic source analysis
  - Comparison with previous period

- **Query Parser**
  - Date parsing (absolute and relative dates)
  - Analysis type inference (increase/decrease factors, overview)
  - Comparison type detection (previous day/week/month)
  - Support for queries like "昨日のアクセス増の要因"

- **GA4 Integration**
  - `GA4ApiClient` with authentication
  - Service account support
  - Date range comparisons
  - Session and user metrics

- **Insight Generation**
  - Natural language insights in Japanese
  - Summary statistics
  - Key findings identification
  - Structured report output

- **CLI Interface**
  - Interactive command-line interface
  - Verbose logging option
  - Error handling and user feedback
  - Configuration file support

### Phase 0: Project Setup (2025-11)

#### Added
- **Project Infrastructure**
  - TypeScript project setup
  - ESLint and Prettier configuration
  - Vitest testing framework
  - Build tooling with tsup

- **Architecture**
  - Clean Architecture layers (Domain, Application, Infrastructure, Presentation)
  - Type-safe error handling
  - Configuration management
  - Logging utilities

- **Development Tools**
  - Git repository initialization
  - npm scripts (build, dev, test, lint, typecheck)
  - TypeScript strict mode
  - Path aliases (@/)

---

## Version History

### [0.1.0] - 2026-03-04
- Initial release
- Full GA4 + GSC integration
- 5-axis analysis support
- Production-ready quality

---

## Breaking Changes

### None (Initial Release)

Future breaking changes will be documented here with migration guides.

---

## Upgrade Guide

### From Development to 0.1.0

No migration needed for initial release.

---

## Roadmap

### Short Term (Q2 2026)
- [x] Task #14: GA4 and GSC correlation analysis
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Integration tests
- [ ] Performance benchmarks

### Medium Term (Q3 2026)
- [ ] Additional analysis dimensions
- [ ] Custom metric support
- [ ] Export formats (CSV, JSON, PDF)
- [ ] Dashboard UI (optional)

### Long Term (Q4 2026+)
- [ ] Multi-language support (English)
- [ ] Machine learning insights
- [ ] Anomaly detection
- [ ] Predictive analytics

---

## Migration Guides

### Future Migrations

Migration guides will be added here when breaking changes are introduced.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: See [README.md](README.md), [API.md](API.md), [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

ISC License - See [LICENSE](LICENSE) file for details

---

## Contributors

Thank you to all contributors who have helped make GA4 Analyzer better!

<!-- Contributors will be listed here -->

---

## Acknowledgments

- Google Analytics 4 Data API
- Google Search Console API
- Vitest testing framework
- TypeScript and Node.js community
