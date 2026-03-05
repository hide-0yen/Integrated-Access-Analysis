/**
 * AnalysisEngine
 * GA4データの多軸分析を実行する
 */

import { ComparisonLogic } from "@/domain/comparison-logic";
import { GA4ApiClient } from "@/infrastructure/ga4-client";
import { GSCApiClient } from "@/infrastructure/gsc-client";
import type {
  ParsedQuery,
  ComparisonMetricValue,
  GA4ReportResponse,
  GSCSearchAnalyticsResponse,
  CorrelationAnalysisResult,
  CorrelationMetric,
} from "@/types/models";
import { format } from "date-fns";

/**
 * 参照元メトリクス
 */
export interface SourceMetric {
  source: string;
  medium: string;
  currentSessions: number;
  previousSessions: number;
  currentNewUsers: number;
  previousNewUsers: number;
  sessionChange: number;
  sessionChangePercent: number;
  newUserChange: number;
  newUserChangePercent: number;
}

/**
 * 参照元分析結果
 */
export interface SourceAnalysisResult {
  sources: SourceMetric[];
  topGainers: SourceMetric[];
  topLosers: SourceMetric[];
}

/**
 * ページメトリクス
 */
export interface PageMetric {
  pagePath: string;
  pageTitle: string;
  currentPageViews: number;
  previousPageViews: number;
  currentSessions: number;
  previousSessions: number;
  pageViewChange: number;
  pageViewChangePercent: number;
  sessionChange: number;
  sessionChangePercent: number;
}

/**
 * ページ分析結果
 */
export interface PageAnalysisResult {
  pages: PageMetric[];
  topGainers: PageMetric[];
  topLosers: PageMetric[];
}

/**
 * デバイス/地域メトリクス
 */
export interface DeviceLocationMetric {
  deviceCategory: string;
  country: string;
  city: string;
  currentSessions: number;
  previousSessions: number;
  currentActiveUsers: number;
  previousActiveUsers: number;
  sessionChange: number;
  sessionChangePercent: number;
  activeUserChange: number;
  activeUserChangePercent: number;
}

/**
 * デバイス/地域分析結果
 */
export interface DeviceLocationAnalysisResult {
  deviceLocations: DeviceLocationMetric[];
  topGainers: DeviceLocationMetric[];
  topLosers: DeviceLocationMetric[];
}

/**
 * イベントメトリクス
 */
export interface EventMetric {
  eventName: string;
  currentEventCount: number;
  previousEventCount: number;
  eventCountChange: number;
  eventCountChangePercent: number;
}

/**
 * イベント分析結果
 */
export interface EventAnalysisResult {
  events: EventMetric[];
  topGainers: EventMetric[];
  topLosers: EventMetric[];
}

/**
 * 検索キーワードメトリクス
 */
export interface SearchKeywordMetric {
  query: string;
  currentClicks: number;
  previousClicks: number;
  currentImpressions: number;
  previousImpressions: number;
  currentCtr: number;
  previousCtr: number;
  currentPosition: number;
  previousPosition: number;
  clicksChange: number;
  clicksChangePercent: number;
  impressionsChange: number;
  impressionsChangePercent: number;
  ctrChange: number;
  positionChange: number;
}

/**
 * 検索キーワード分析結果
 */
export interface SearchKeywordAnalysisResult {
  keywords: SearchKeywordMetric[];
  topGainers: SearchKeywordMetric[];
  topLosers: SearchKeywordMetric[];
}

/**
 * 相関分析結果の再エクスポート
 */
export type {
  CorrelationAnalysisResult,
  CorrelationMetric,
} from "@/types/models";

/**
 * AnalysisEngineクラス
 */
export class AnalysisEngine {
  private comparisonLogic: ComparisonLogic;

  constructor() {
    this.comparisonLogic = new ComparisonLogic();
  }

  /**
   * トラフィックソース分析を実行する
   */
  async analyzeTrafficSources(
    query: ParsedQuery,
    client: GA4ApiClient,
  ): Promise<SourceAnalysisResult> {
    const targetDate = format(query.targetDate, "yyyy-MM-dd");
    const comparisonDate = format(query.comparisonDate, "yyyy-MM-dd");

    // GA4 APIにクエリを実行
    const response = await client.runReport({
      dateRanges: [
        { startDate: targetDate, endDate: targetDate },
        { startDate: comparisonDate, endDate: comparisonDate },
      ],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "newUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    // データ変換
    const sources = this.transformSourceData(response);

    // 増加/減少上位3件を抽出
    const topGainers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterIncreases(
          sources.map((s) => ({
            label: `${s.source}/${s.medium}`,
            current: s.currentSessions,
            previous: s.previousSessions,
            absoluteChange: s.sessionChange,
            percentChange: s.sessionChangePercent,
            isSignificant: Math.abs(s.sessionChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingSource = sources.find(
          (s) => `${s.source}/${s.medium}` === comparison.label,
        );
        if (!matchingSource) {
          throw new Error(
            `Source not found for comparison: ${comparison.label}`,
          );
        }
        return matchingSource;
      });

    const topLosers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterDecreases(
          sources.map((s) => ({
            label: `${s.source}/${s.medium}`,
            current: s.currentSessions,
            previous: s.previousSessions,
            absoluteChange: s.sessionChange,
            percentChange: s.sessionChangePercent,
            isSignificant: Math.abs(s.sessionChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingSource = sources.find(
          (s) => `${s.source}/${s.medium}` === comparison.label,
        );
        if (!matchingSource) {
          throw new Error(
            `Source not found for comparison: ${comparison.label}`,
          );
        }
        return matchingSource;
      });

    return {
      sources,
      topGainers,
      topLosers,
    };
  }

  /**
   * GA4レスポンスをSourceMetricに変換する
   */
  private transformSourceData(response: GA4ReportResponse): SourceMetric[] {
    // レスポンスの検証
    if (response.rows.length === 0) {
      console.warn("GA4 API returned no data rows");
      return [];
    }

    // GA4 APIは複数の日付範囲を使用すると、dateRangeディメンションを自動追加
    // 各source/mediumの組み合わせに対して、date_range_0とdate_range_1の2行が返される
    // これらをグループ化して、1つのSourceMetricオブジェクトにまとめる

    interface RowGroup {
      source: string;
      medium: string;
      currentSessions: number;
      previousSessions: number;
      currentNewUsers: number;
      previousNewUsers: number;
    }

    const grouped = new Map<string, RowGroup>();

    for (const row of response.rows) {
      // 配列要素の存在確認
      if (row.dimensionValues.length < 3) {
        console.warn(
          `Skipping row: dimensionValues is incomplete. Expected 3, got ${String(row.dimensionValues.length)}`,
        );
        continue;
      }
      if (row.metricValues.length < 2) {
        console.warn(
          `Skipping row: metricValues is incomplete. Expected 2, got ${String(row.metricValues.length)}`,
        );
        continue;
      }

      const source = row.dimensionValues[0]?.value || "(unknown)";
      const medium = row.dimensionValues[1]?.value || "(unknown)";
      const dateRange = row.dimensionValues[2]?.value || "";
      const sessions = parseInt(row.metricValues[0]?.value || "0", 10);
      const newUsers = parseInt(row.metricValues[1]?.value || "0", 10);

      const key = `${source}/${medium}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          source,
          medium,
          currentSessions: 0,
          previousSessions: 0,
          currentNewUsers: 0,
          previousNewUsers: 0,
        });
      }

      const group = grouped.get(key);
      if (!group) continue;

      if (dateRange === "date_range_0") {
        // ターゲット日付のデータ
        group.currentSessions = sessions;
        group.currentNewUsers = newUsers;
      } else if (dateRange === "date_range_1") {
        // 比較日付のデータ
        group.previousSessions = sessions;
        group.previousNewUsers = newUsers;
      }
    }

    // グループ化されたデータをSourceMetricに変換
    return Array.from(grouped.values()).map((group) => {
      // セッション数の比較
      const sessionComparison = this.comparisonLogic.compare(
        {
          value: group.currentSessions,
          label: "sessions",
        } as ComparisonMetricValue,
        {
          value: group.previousSessions,
          label: "sessions",
        } as ComparisonMetricValue,
      );

      // 新規ユーザー数の比較
      const newUserComparison = this.comparisonLogic.compare(
        {
          value: group.currentNewUsers,
          label: "newUsers",
        } as ComparisonMetricValue,
        {
          value: group.previousNewUsers,
          label: "newUsers",
        } as ComparisonMetricValue,
      );

      return {
        source: group.source,
        medium: group.medium,
        currentSessions: group.currentSessions,
        previousSessions: group.previousSessions,
        currentNewUsers: group.currentNewUsers,
        previousNewUsers: group.previousNewUsers,
        sessionChange: sessionComparison.absoluteChange,
        sessionChangePercent: sessionComparison.percentChange,
        newUserChange: newUserComparison.absoluteChange,
        newUserChangePercent: newUserComparison.percentChange,
      };
    });
  }

  /**
   * ページ/コンテンツ分析を実行する
   */
  async analyzePages(
    query: ParsedQuery,
    client: GA4ApiClient,
  ): Promise<PageAnalysisResult> {
    const targetDate = format(query.targetDate, "yyyy-MM-dd");
    const comparisonDate = format(query.comparisonDate, "yyyy-MM-dd");

    const response = await client.runReport({
      dateRanges: [
        { startDate: targetDate, endDate: targetDate },
        { startDate: comparisonDate, endDate: comparisonDate },
      ],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });

    const pages = this.transformPageData(response);

    const topGainers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterIncreases(
          pages.map((p) => ({
            label: p.pagePath,
            current: p.currentPageViews,
            previous: p.previousPageViews,
            absoluteChange: p.pageViewChange,
            percentChange: p.pageViewChangePercent,
            isSignificant: Math.abs(p.pageViewChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingPage = pages.find((p) => p.pagePath === comparison.label);
        if (!matchingPage) {
          throw new Error(`Page not found for comparison: ${comparison.label}`);
        }
        return matchingPage;
      });

    const topLosers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterDecreases(
          pages.map((p) => ({
            label: p.pagePath,
            current: p.currentPageViews,
            previous: p.previousPageViews,
            absoluteChange: p.pageViewChange,
            percentChange: p.pageViewChangePercent,
            isSignificant: Math.abs(p.pageViewChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingPage = pages.find((p) => p.pagePath === comparison.label);
        if (!matchingPage) {
          throw new Error(`Page not found for comparison: ${comparison.label}`);
        }
        return matchingPage;
      });

    return {
      pages,
      topGainers,
      topLosers,
    };
  }

  /**
   * GA4レスポンスをPageMetricに変換する
   */
  private transformPageData(response: GA4ReportResponse): PageMetric[] {
    if (response.rows.length === 0) {
      console.warn("GA4 API returned no data rows");
      return [];
    }

    interface RowGroup {
      pagePath: string;
      pageTitle: string;
      currentPageViews: number;
      previousPageViews: number;
      currentSessions: number;
      previousSessions: number;
    }

    const grouped = new Map<string, RowGroup>();

    for (const row of response.rows) {
      if (row.dimensionValues.length < 3) {
        console.warn(
          `Skipping row: dimensionValues is incomplete. Expected 3, got ${String(row.dimensionValues.length)}`,
        );
        continue;
      }
      if (row.metricValues.length < 2) {
        console.warn(
          `Skipping row: metricValues is incomplete. Expected 2, got ${String(row.metricValues.length)}`,
        );
        continue;
      }

      const pagePath = row.dimensionValues[0]?.value || "(unknown)";
      const pageTitle = row.dimensionValues[1]?.value || "(not set)";
      const dateRange = row.dimensionValues[2]?.value || "";
      const pageViews = parseInt(row.metricValues[0]?.value || "0", 10);
      const sessions = parseInt(row.metricValues[1]?.value || "0", 10);

      const key = pagePath;

      if (!grouped.has(key)) {
        grouped.set(key, {
          pagePath,
          pageTitle,
          currentPageViews: 0,
          previousPageViews: 0,
          currentSessions: 0,
          previousSessions: 0,
        });
      }

      const group = grouped.get(key);
      if (!group) continue;

      if (dateRange === "date_range_0") {
        group.currentPageViews = pageViews;
        group.currentSessions = sessions;
      } else if (dateRange === "date_range_1") {
        group.previousPageViews = pageViews;
        group.previousSessions = sessions;
      }
    }

    return Array.from(grouped.values()).map((group) => {
      const pageViewComparison = this.comparisonLogic.compare(
        {
          value: group.currentPageViews,
          label: "pageViews",
        } as ComparisonMetricValue,
        {
          value: group.previousPageViews,
          label: "pageViews",
        } as ComparisonMetricValue,
      );

      const sessionComparison = this.comparisonLogic.compare(
        {
          value: group.currentSessions,
          label: "sessions",
        } as ComparisonMetricValue,
        {
          value: group.previousSessions,
          label: "sessions",
        } as ComparisonMetricValue,
      );

      return {
        pagePath: group.pagePath,
        pageTitle: group.pageTitle,
        currentPageViews: group.currentPageViews,
        previousPageViews: group.previousPageViews,
        currentSessions: group.currentSessions,
        previousSessions: group.previousSessions,
        pageViewChange: pageViewComparison.absoluteChange,
        pageViewChangePercent: pageViewComparison.percentChange,
        sessionChange: sessionComparison.absoluteChange,
        sessionChangePercent: sessionComparison.percentChange,
      };
    });
  }

  /**
   * デバイス/地域分析を実行する
   */
  async analyzeDevicesAndLocations(
    query: ParsedQuery,
    client: GA4ApiClient,
  ): Promise<DeviceLocationAnalysisResult> {
    const targetDate = format(query.targetDate, "yyyy-MM-dd");
    const comparisonDate = format(query.comparisonDate, "yyyy-MM-dd");

    const response = await client.runReport({
      dateRanges: [
        { startDate: targetDate, endDate: targetDate },
        { startDate: comparisonDate, endDate: comparisonDate },
      ],
      dimensions: [
        { name: "deviceCategory" },
        { name: "country" },
        { name: "city" },
      ],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });

    const deviceLocations = this.transformDeviceLocationData(response);

    const topGainers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterIncreases(
          deviceLocations.map((dl) => ({
            label: `${dl.deviceCategory}/${dl.country}/${dl.city}`,
            current: dl.currentSessions,
            previous: dl.previousSessions,
            absoluteChange: dl.sessionChange,
            percentChange: dl.sessionChangePercent,
            isSignificant: Math.abs(dl.sessionChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matching = deviceLocations.find(
          (dl) =>
            `${dl.deviceCategory}/${dl.country}/${dl.city}` ===
            comparison.label,
        );
        if (!matching) {
          throw new Error(
            `Device/Location not found for comparison: ${comparison.label}`,
          );
        }
        return matching;
      });

    const topLosers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterDecreases(
          deviceLocations.map((dl) => ({
            label: `${dl.deviceCategory}/${dl.country}/${dl.city}`,
            current: dl.currentSessions,
            previous: dl.previousSessions,
            absoluteChange: dl.sessionChange,
            percentChange: dl.sessionChangePercent,
            isSignificant: Math.abs(dl.sessionChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matching = deviceLocations.find(
          (dl) =>
            `${dl.deviceCategory}/${dl.country}/${dl.city}` ===
            comparison.label,
        );
        if (!matching) {
          throw new Error(
            `Device/Location not found for comparison: ${comparison.label}`,
          );
        }
        return matching;
      });

    return {
      deviceLocations,
      topGainers,
      topLosers,
    };
  }

  /**
   * GA4レスポンスをDeviceLocationMetricに変換する
   */
  private transformDeviceLocationData(
    response: GA4ReportResponse,
  ): DeviceLocationMetric[] {
    if (response.rows.length === 0) {
      console.warn("GA4 API returned no data rows");
      return [];
    }

    interface RowGroup {
      deviceCategory: string;
      country: string;
      city: string;
      currentSessions: number;
      previousSessions: number;
      currentActiveUsers: number;
      previousActiveUsers: number;
    }

    const grouped = new Map<string, RowGroup>();

    for (const row of response.rows) {
      if (row.dimensionValues.length < 4) {
        console.warn(
          `Skipping row: dimensionValues is incomplete. Expected 4, got ${String(row.dimensionValues.length)}`,
        );
        continue;
      }
      if (row.metricValues.length < 2) {
        console.warn(
          `Skipping row: metricValues is incomplete. Expected 2, got ${String(row.metricValues.length)}`,
        );
        continue;
      }

      const deviceCategory = row.dimensionValues[0]?.value || "(unknown)";
      const country = row.dimensionValues[1]?.value || "(not set)";
      const city = row.dimensionValues[2]?.value || "(not set)";
      const dateRange = row.dimensionValues[3]?.value || "";
      const sessions = parseInt(row.metricValues[0]?.value || "0", 10);
      const activeUsers = parseInt(row.metricValues[1]?.value || "0", 10);

      const key = `${deviceCategory}/${country}/${city}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          deviceCategory,
          country,
          city,
          currentSessions: 0,
          previousSessions: 0,
          currentActiveUsers: 0,
          previousActiveUsers: 0,
        });
      }

      const group = grouped.get(key);
      if (!group) continue;

      if (dateRange === "date_range_0") {
        group.currentSessions = sessions;
        group.currentActiveUsers = activeUsers;
      } else if (dateRange === "date_range_1") {
        group.previousSessions = sessions;
        group.previousActiveUsers = activeUsers;
      }
    }

    return Array.from(grouped.values()).map((group) => {
      const sessionComparison = this.comparisonLogic.compare(
        {
          value: group.currentSessions,
          label: "sessions",
        } as ComparisonMetricValue,
        {
          value: group.previousSessions,
          label: "sessions",
        } as ComparisonMetricValue,
      );

      const activeUserComparison = this.comparisonLogic.compare(
        {
          value: group.currentActiveUsers,
          label: "activeUsers",
        } as ComparisonMetricValue,
        {
          value: group.previousActiveUsers,
          label: "activeUsers",
        } as ComparisonMetricValue,
      );

      return {
        deviceCategory: group.deviceCategory,
        country: group.country,
        city: group.city,
        currentSessions: group.currentSessions,
        previousSessions: group.previousSessions,
        currentActiveUsers: group.currentActiveUsers,
        previousActiveUsers: group.previousActiveUsers,
        sessionChange: sessionComparison.absoluteChange,
        sessionChangePercent: sessionComparison.percentChange,
        activeUserChange: activeUserComparison.absoluteChange,
        activeUserChangePercent: activeUserComparison.percentChange,
      };
    });
  }

  /**
   * イベント分析を実行する
   */
  async analyzeEvents(
    query: ParsedQuery,
    client: GA4ApiClient,
  ): Promise<EventAnalysisResult> {
    const targetDate = format(query.targetDate, "yyyy-MM-dd");
    const comparisonDate = format(query.comparisonDate, "yyyy-MM-dd");

    const response = await client.runReport({
      dateRanges: [
        { startDate: targetDate, endDate: targetDate },
        { startDate: comparisonDate, endDate: comparisonDate },
      ],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    });

    const events = this.transformEventData(response);

    const topGainers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterIncreases(
          events.map((e) => ({
            label: e.eventName,
            current: e.currentEventCount,
            previous: e.previousEventCount,
            absoluteChange: e.eventCountChange,
            percentChange: e.eventCountChangePercent,
            isSignificant: Math.abs(e.eventCountChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingEvent = events.find(
          (e) => e.eventName === comparison.label,
        );
        if (!matchingEvent) {
          throw new Error(
            `Event not found for comparison: ${comparison.label}`,
          );
        }
        return matchingEvent;
      });

    const topLosers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterDecreases(
          events.map((e) => ({
            label: e.eventName,
            current: e.currentEventCount,
            previous: e.previousEventCount,
            absoluteChange: e.eventCountChange,
            percentChange: e.eventCountChangePercent,
            isSignificant: Math.abs(e.eventCountChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingEvent = events.find(
          (e) => e.eventName === comparison.label,
        );
        if (!matchingEvent) {
          throw new Error(
            `Event not found for comparison: ${comparison.label}`,
          );
        }
        return matchingEvent;
      });

    return {
      events,
      topGainers,
      topLosers,
    };
  }

  /**
   * GA4レスポンスをEventMetricに変換する
   */
  private transformEventData(response: GA4ReportResponse): EventMetric[] {
    if (response.rows.length === 0) {
      console.warn("GA4 API returned no data rows");
      return [];
    }

    interface RowGroup {
      eventName: string;
      currentEventCount: number;
      previousEventCount: number;
    }

    const grouped = new Map<string, RowGroup>();

    for (const row of response.rows) {
      if (row.dimensionValues.length < 2) {
        console.warn(
          `Skipping row: dimensionValues is incomplete. Expected 2, got ${String(row.dimensionValues.length)}`,
        );
        continue;
      }
      if (row.metricValues.length < 1) {
        console.warn(
          `Skipping row: metricValues is incomplete. Expected 1, got ${String(row.metricValues.length)}`,
        );
        continue;
      }

      const eventName = row.dimensionValues[0]?.value || "(unknown)";
      const dateRange = row.dimensionValues[1]?.value || "";
      const eventCount = parseInt(row.metricValues[0]?.value || "0", 10);

      const key = eventName;

      if (!grouped.has(key)) {
        grouped.set(key, {
          eventName,
          currentEventCount: 0,
          previousEventCount: 0,
        });
      }

      const group = grouped.get(key);
      if (!group) continue;

      if (dateRange === "date_range_0") {
        group.currentEventCount = eventCount;
      } else if (dateRange === "date_range_1") {
        group.previousEventCount = eventCount;
      }
    }

    return Array.from(grouped.values()).map((group) => {
      const eventCountComparison = this.comparisonLogic.compare(
        {
          value: group.currentEventCount,
          label: "eventCount",
        } as ComparisonMetricValue,
        {
          value: group.previousEventCount,
          label: "eventCount",
        } as ComparisonMetricValue,
      );

      return {
        eventName: group.eventName,
        currentEventCount: group.currentEventCount,
        previousEventCount: group.previousEventCount,
        eventCountChange: eventCountComparison.absoluteChange,
        eventCountChangePercent: eventCountComparison.percentChange,
      };
    });
  }

  /**
   * 検索キーワード分析を実行する(GSC)
   */
  async analyzeSearchKeywords(
    query: ParsedQuery,
    client: GSCApiClient,
  ): Promise<SearchKeywordAnalysisResult> {
    const targetDate = format(query.targetDate, "yyyy-MM-dd");
    const comparisonDate = format(query.comparisonDate, "yyyy-MM-dd");

    // 2つの期間のデータを取得
    const [targetResponse, comparisonResponse] = await Promise.all([
      client.searchAnalyticsQueryWithRetry({
        startDate: targetDate,
        endDate: targetDate,
        dimensions: ["query"],
        rowLimit: 10,
      }),
      client.searchAnalyticsQueryWithRetry({
        startDate: comparisonDate,
        endDate: comparisonDate,
        dimensions: ["query"],
        rowLimit: 10,
      }),
    ]);

    const keywords = this.transformSearchKeywordData(
      targetResponse,
      comparisonResponse,
    );

    const topGainers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterIncreases(
          keywords.map((k) => ({
            label: k.query,
            current: k.currentClicks,
            previous: k.previousClicks,
            absoluteChange: k.clicksChange,
            percentChange: k.clicksChangePercent,
            isSignificant: Math.abs(k.clicksChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingKeyword = keywords.find(
          (k) => k.query === comparison.label,
        );
        if (!matchingKeyword) {
          throw new Error(
            `Keyword not found for comparison: ${comparison.label}`,
          );
        }
        return matchingKeyword;
      });

    const topLosers = this.comparisonLogic
      .topN(
        this.comparisonLogic.filterDecreases(
          keywords.map((k) => ({
            label: k.query,
            current: k.currentClicks,
            previous: k.previousClicks,
            absoluteChange: k.clicksChange,
            percentChange: k.clicksChangePercent,
            isSignificant: Math.abs(k.clicksChangePercent) >= 10,
          })),
        ),
        3,
      )
      .map((comparison) => {
        const matchingKeyword = keywords.find(
          (k) => k.query === comparison.label,
        );
        if (!matchingKeyword) {
          throw new Error(
            `Keyword not found for comparison: ${comparison.label}`,
          );
        }
        return matchingKeyword;
      });

    return {
      keywords,
      topGainers,
      topLosers,
    };
  }

  /**
   * GSCレスポンスをSearchKeywordMetricに変換する
   */
  private transformSearchKeywordData(
    targetResponse: GSCSearchAnalyticsResponse,
    comparisonResponse: GSCSearchAnalyticsResponse,
  ): SearchKeywordMetric[] {
    const hasTargetRows = targetResponse.rows && targetResponse.rows.length > 0;
    const hasComparisonRows =
      comparisonResponse.rows && comparisonResponse.rows.length > 0;

    if (!hasTargetRows && !hasComparisonRows) {
      console.warn("GSC API returned no data rows");
      return [];
    }

    // 両方の期間のデータをマージ
    const keywordMap = new Map<
      string,
      {
        query: string;
        currentClicks: number;
        previousClicks: number;
        currentImpressions: number;
        previousImpressions: number;
        currentCtr: number;
        previousCtr: number;
        currentPosition: number;
        previousPosition: number;
      }
    >();

    // ターゲット期間のデータ
    if (hasTargetRows && targetResponse.rows) {
      for (const row of targetResponse.rows) {
        const query = row.keys[0] || "(not set)";
        keywordMap.set(query, {
          query,
          currentClicks: row.clicks,
          previousClicks: 0,
          currentImpressions: row.impressions,
          previousImpressions: 0,
          currentCtr: row.ctr,
          previousCtr: 0,
          currentPosition: row.position,
          previousPosition: 0,
        });
      }
    }

    // 比較期間のデータ
    if (hasComparisonRows && comparisonResponse.rows) {
      for (const row of comparisonResponse.rows) {
        const query = row.keys[0] || "(not set)";
        const existing = keywordMap.get(query);
        if (existing) {
          existing.previousClicks = row.clicks;
          existing.previousImpressions = row.impressions;
          existing.previousCtr = row.ctr;
          existing.previousPosition = row.position;
        } else {
          keywordMap.set(query, {
            query,
            currentClicks: 0,
            previousClicks: row.clicks,
            currentImpressions: 0,
            previousImpressions: row.impressions,
            currentCtr: 0,
            previousCtr: row.ctr,
            currentPosition: 0,
            previousPosition: row.position,
          });
        }
      }
    }

    return Array.from(keywordMap.values()).map((data) => {
      const clicksComparison = this.comparisonLogic.compare(
        { value: data.currentClicks, label: "clicks" } as ComparisonMetricValue,
        {
          value: data.previousClicks,
          label: "clicks",
        } as ComparisonMetricValue,
      );

      const impressionsComparison = this.comparisonLogic.compare(
        {
          value: data.currentImpressions,
          label: "impressions",
        } as ComparisonMetricValue,
        {
          value: data.previousImpressions,
          label: "impressions",
        } as ComparisonMetricValue,
      );

      return {
        query: data.query,
        currentClicks: data.currentClicks,
        previousClicks: data.previousClicks,
        currentImpressions: data.currentImpressions,
        previousImpressions: data.previousImpressions,
        currentCtr: data.currentCtr,
        previousCtr: data.previousCtr,
        currentPosition: data.currentPosition,
        previousPosition: data.previousPosition,
        clicksChange: clicksComparison.absoluteChange,
        clicksChangePercent: clicksComparison.percentChange,
        impressionsChange: impressionsComparison.absoluteChange,
        impressionsChangePercent: impressionsComparison.percentChange,
        ctrChange: data.currentCtr - data.previousCtr,
        positionChange: data.currentPosition - data.previousPosition,
      };
    });
  }

  /**
   * GA4オーガニック検索とGSCキーワードの相関分析
   *
   * @param query - 解析済みクエリ
   * @param ga4Client - GA4 APIクライアント
   * @param gscClient - GSC APIクライアント
   * @returns 相関分析結果
   */
  async analyzeCorrelation(
    query: ParsedQuery,
    ga4Client: GA4ApiClient,
    gscClient: GSCApiClient,
  ): Promise<CorrelationAnalysisResult> {
    // GA4とGSCの両方から並列でデータ取得
    const [sourceAnalysis, keywordAnalysis] = await Promise.all([
      this.analyzeTrafficSources(query, ga4Client),
      this.analyzeSearchKeywords(query, gscClient),
    ]);

    // オーガニック検索のセッション数を抽出
    const organicSource = sourceAnalysis.sources.find(
      (s) =>
        s.source.toLowerCase() === "google" &&
        s.medium.toLowerCase() === "organic",
    );

    if (!organicSource) {
      // オーガニック検索データがない場合は空の結果を返す
      return this.createEmptyCorrelationResult();
    }

    // GSCキーワードデータとサマリー
    const keywords = keywordAnalysis.keywords;

    // サマリー情報を計算
    const currentTotalClicks = keywords.reduce(
      (sum, k) => sum + k.currentClicks,
      0,
    );
    const previousTotalClicks = keywords.reduce(
      (sum, k) => sum + k.previousClicks,
      0,
    );
    const absoluteChange = currentTotalClicks - previousTotalClicks;
    const percentChange =
      previousTotalClicks === 0
        ? currentTotalClicks > 0
          ? Infinity
          : 0
        : (absoluteChange / previousTotalClicks) * 100;

    // 相関メトリクスの計算
    const correlation = this.calculateCorrelation(organicSource, keywords, {
      currentTotalClicks,
      previousTotalClicks,
      absoluteChange,
      percentChange,
    });

    // インサイトの生成
    const insights = this.generateCorrelationInsights(correlation);

    return {
      correlation,
      insights,
    };
  }

  /**
   * 相関メトリクスの計算
   */
  private calculateCorrelation(
    organicSource: SourceMetric,
    keywords: SearchKeywordMetric[],
    gscSummary: {
      currentTotalClicks: number;
      previousTotalClicks: number;
      absoluteChange: number;
      percentChange: number;
    },
  ): CorrelationMetric {
    // クリック→セッション変換率の推定（通常85%程度）
    const CLICK_TO_SESSION_RATE = 0.85;

    // オーガニック検索セッションメトリクス
    const organicSessions = {
      current: organicSource.currentSessions,
      previous: organicSource.previousSessions,
      change: organicSource.sessionChange,
      changePercent: organicSource.sessionChangePercent,
    };

    // GSC総合メトリクス
    const totalClicks = {
      current: gscSummary.currentTotalClicks,
      previous: gscSummary.previousTotalClicks,
      change: gscSummary.absoluteChange,
      changePercent: gscSummary.percentChange,
    };

    // キーワードごとの相関計算
    const keywordCorrelations = keywords.map((keyword) => {
      const estimatedSessionContribution =
        keyword.clicksChange * CLICK_TO_SESSION_RATE;
      const contributionPercent =
        organicSessions.change !== 0
          ? (estimatedSessionContribution / organicSessions.change) * 100
          : 0;

      return {
        query: keyword.query,
        clicks: keyword.currentClicks,
        clicksChange: keyword.clicksChange,
        clicksChangePercent: keyword.clicksChangePercent,
        position: keyword.currentPosition,
        positionChange: keyword.positionChange,
        estimatedSessionContribution,
        contributionPercent,
      };
    });

    // 寄与度でソート
    const sortedByContribution = [...keywordCorrelations].sort(
      (a, b) =>
        Math.abs(b.estimatedSessionContribution) -
        Math.abs(a.estimatedSessionContribution),
    );

    // Top contributors (増加要因)
    const topContributors = sortedByContribution
      .filter((k) => k.estimatedSessionContribution > 0)
      .slice(0, 5)
      .map((k) => ({
        query: k.query,
        contribution: k.estimatedSessionContribution,
        contributionPercent: k.contributionPercent,
      }));

    // Top detractors (減少要因)
    const topDetractors = sortedByContribution
      .filter((k) => k.estimatedSessionContribution < 0)
      .slice(0, 5)
      .map((k) => ({
        query: k.query,
        contribution: k.estimatedSessionContribution,
        contributionPercent: k.contributionPercent,
      }));

    return {
      organicSessions,
      totalClicks,
      keywordCorrelations,
      clickToSessionRate: CLICK_TO_SESSION_RATE,
      topContributors,
      topDetractors,
    };
  }

  /**
   * 相関分析のインサイト生成
   */
  private generateCorrelationInsights(
    correlation: CorrelationMetric,
  ): string[] {
    const insights: string[] = [];

    // セッションとクリックの相関
    const sessionChange = correlation.organicSessions.change;
    const clickChange = correlation.totalClicks.change;

    if (sessionChange > 0 && clickChange > 0) {
      insights.push(
        `オーガニック検索セッションは${Math.abs(sessionChange).toFixed(0)}セッション増加（${correlation.organicSessions.changePercent.toFixed(1)}%）しており、GSCのクリック数も${Math.abs(clickChange).toFixed(0)}クリック増加（${correlation.totalClicks.changePercent.toFixed(1)}%）しています。`,
      );
    } else if (sessionChange < 0 && clickChange < 0) {
      insights.push(
        `オーガニック検索セッションは${Math.abs(sessionChange).toFixed(0)}セッション減少（${Math.abs(correlation.organicSessions.changePercent).toFixed(1)}%）しており、GSCのクリック数も${Math.abs(clickChange).toFixed(0)}クリック減少（${Math.abs(correlation.totalClicks.changePercent).toFixed(1)}%）しています。`,
      );
    } else {
      insights.push(
        `オーガニック検索セッションの変化（${sessionChange > 0 ? "+" : ""}${sessionChange.toFixed(0)}セッション）とGSCクリック数の変化（${clickChange > 0 ? "+" : ""}${clickChange.toFixed(0)}クリック）に乖離が見られます。`,
      );
    }

    // Top contributorsのインサイト
    if (correlation.topContributors.length > 0) {
      const topKeywords = correlation.topContributors
        .slice(0, 3)
        .map(
          (c) =>
            `「${c.query}」（+${c.contribution.toFixed(0)}セッション推定、寄与率${c.contributionPercent.toFixed(1)}%）`,
        )
        .join("、");

      insights.push(
        `**検索流入増加の主要キーワード**: ${topKeywords}が増加に大きく寄与しています。`,
      );
    }

    // Top detractorsのインサイト
    if (correlation.topDetractors.length > 0) {
      const topKeywords = correlation.topDetractors
        .slice(0, 3)
        .map(
          (c) =>
            `「${c.query}」（${c.contribution.toFixed(0)}セッション推定、影響率${Math.abs(c.contributionPercent).toFixed(1)}%）`,
        )
        .join("、");

      insights.push(
        `**検索流入減少の主要キーワード**: ${topKeywords}が減少に影響しています。`,
      );
    }

    // 順位変動の影響
    const significantRankChanges = correlation.keywordCorrelations.filter(
      (k) => Math.abs(k.positionChange) >= 3,
    );

    if (significantRankChanges.length > 0) {
      const rankImprovement = significantRankChanges.filter(
        (k) => k.positionChange < 0,
      ).length;
      const rankDrop = significantRankChanges.filter(
        (k) => k.positionChange > 0,
      ).length;

      if (rankImprovement > rankDrop) {
        insights.push(
          `${String(rankImprovement)}個のキーワードで検索順位が3位以上向上しており、これが流入増加の一因となっています。`,
        );
      } else if (rankDrop > rankImprovement) {
        insights.push(
          `${String(rankDrop)}個のキーワードで検索順位が3位以上低下しており、これが流入減少の一因となっています。`,
        );
      }
    }

    return insights;
  }

  /**
   * 空の相関分析結果を作成
   */
  private createEmptyCorrelationResult(): CorrelationAnalysisResult {
    return {
      correlation: {
        organicSessions: {
          current: 0,
          previous: 0,
          change: 0,
          changePercent: 0,
        },
        totalClicks: {
          current: 0,
          previous: 0,
          change: 0,
          changePercent: 0,
        },
        keywordCorrelations: [],
        clickToSessionRate: 0.85,
        topContributors: [],
        topDetractors: [],
      },
      insights: ["オーガニック検索のデータが見つかりませんでした。"],
    };
  }
}
