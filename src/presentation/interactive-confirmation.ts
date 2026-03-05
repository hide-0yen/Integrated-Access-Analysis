/**
 * InteractiveConfirmation
 * ユーザーとの対話的な確認フローを管理
 */

import * as readline from "readline/promises";
import type { DetectionConfig } from "@/domain/types/exploratory-query";

/**
 * 確認結果
 */
export interface ConfirmationResult {
  confirmed: boolean;
  adjustedDetection?: DetectionConfig;
}

/**
 * InteractiveConfirmationクラス
 */
export class InteractiveConfirmation {
  private rl: readline.Interface;

  constructor(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
  ) {
    this.rl = readline.createInterface({
      input,
      output,
    });
  }

  /**
   * 確認プロンプトを実行
   */
  async confirm(
    prompts: string[],
    currentDetection: DetectionConfig,
  ): Promise<ConfirmationResult> {
    console.log("\n--- 確認が必要な項目があります ---");

    for (const prompt of prompts) {
      console.log(`- ${prompt}`);
    }

    console.log("\n現在の設定:");
    console.log(
      `  検出タイプ: ${this.translateDetectionType(currentDetection.type)}`,
    );
    console.log(`  検出基準: ${this.translateBasis(currentDetection.basis)}`);
    if (currentDetection.threshold !== undefined) {
      console.log(`  閾値: ${String(currentDetection.threshold)}%`);
    }

    const answer = await this.rl.question(
      "\nこの設定で続行しますか？ (y/n/adjust): ",
    );

    if (answer.toLowerCase() === "n") {
      this.close();
      return { confirmed: false };
    }

    if (answer.toLowerCase() === "adjust") {
      const adjusted = await this.adjustDetectionSettings(currentDetection);
      this.close();
      return { confirmed: true, adjustedDetection: adjusted };
    }

    this.close();
    return { confirmed: true };
  }

  /**
   * 検出設定を調整
   */
  private async adjustDetectionSettings(
    current: DetectionConfig,
  ): Promise<DetectionConfig> {
    console.log("\n--- 検出設定の調整 ---");

    // 検出タイプの調整
    console.log("\n検出タイプを選択してください:");
    console.log("  1. 増加検出 (growth)");
    console.log("  2. 減少検出 (decline)");
    console.log("  3. 異常値検出 (anomaly)");
    console.log("  4. 閾値検出 (threshold)");
    console.log("  5. 検出なし (none)");

    const typeChoice = await this.rl.question(
      `選択 [現在: ${this.translateDetectionType(current.type)}]: `,
    );
    const detectionType = this.parseDetectionTypeChoice(
      typeChoice,
      current.type,
    );

    // 検出基準の調整
    console.log("\n検出基準を選択してください:");
    console.log("  1. 前日比 (day_over_day)");
    console.log("  2. 期間平均との比較 (period_average)");
    console.log("  3. 統計的手法 (statistical)");

    const basisChoice = await this.rl.question(
      `選択 [現在: ${this.translateBasis(current.basis)}]: `,
    );
    const basis = this.parseBasisChoice(basisChoice, current.basis);

    // 閾値の調整（threshold typeの場合）
    let threshold = current.threshold;
    if (detectionType === "threshold") {
      const currentThreshold =
        current.threshold !== undefined ? String(current.threshold) : "未設定";
      const thresholdInput = await this.rl.question(
        `閾値（変化率%）を入力 [現在: ${currentThreshold}]: `,
      );
      threshold = thresholdInput
        ? Number.parseFloat(thresholdInput)
        : current.threshold;
    }

    return {
      type: detectionType,
      basis,
      threshold,
    };
  }

  /**
   * 検出タイプの選択肢をパース
   */
  private parseDetectionTypeChoice(
    choice: string,
    fallback: DetectionConfig["type"],
  ): DetectionConfig["type"] {
    switch (choice.trim()) {
      case "1":
        return "growth";
      case "2":
        return "decline";
      case "3":
        return "anomaly";
      case "4":
        return "threshold";
      case "5":
        return "none";
      default:
        return fallback;
    }
  }

  /**
   * 検出基準の選択肢をパース
   */
  private parseBasisChoice(
    choice: string,
    fallback: DetectionConfig["basis"],
  ): DetectionConfig["basis"] {
    switch (choice.trim()) {
      case "1":
        return "day_over_day";
      case "2":
        return "period_average";
      case "3":
        return "statistical";
      default:
        return fallback;
    }
  }

  /**
   * 検出タイプを日本語に翻訳
   */
  private translateDetectionType(type: DetectionConfig["type"]): string {
    const translations: Record<DetectionConfig["type"], string> = {
      growth: "増加検出",
      decline: "減少検出",
      anomaly: "異常値検出",
      threshold: "閾値検出",
      none: "検出なし",
    };
    return translations[type];
  }

  /**
   * 検出基準を日本語に翻訳
   */
  private translateBasis(basis: DetectionConfig["basis"]): string {
    const translations: Record<
      NonNullable<DetectionConfig["basis"]>,
      string
    > = {
      day_over_day: "前日比",
      period_average: "期間平均との比較",
      statistical: "統計的手法",
      unspecified: "未指定",
    };
    return translations[basis ?? "unspecified"];
  }

  /**
   * readlineインターフェースをクローズ
   */
  close(): void {
    this.rl.close();
  }
}
