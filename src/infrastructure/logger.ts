/**
 * Logger
 * 構造化ログ出力とログレベル管理
 */

/**
 * ログレベル
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

/**
 * ログメタデータ
 */
export interface LogMeta {
  [key: string]: unknown;
}

/**
 * Loggerクラス
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = LogLevel.INFO, prefix = "") {
    this.level = level;
    this.prefix = prefix;
  }

  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * エラーログ
   */
  error(message: string, meta?: LogMeta): void {
    if (this.level >= LogLevel.ERROR) {
      this.log("ERROR", message, meta);
    }
  }

  /**
   * 警告ログ
   */
  warn(message: string, meta?: LogMeta): void {
    if (this.level >= LogLevel.WARN) {
      this.log("WARN", message, meta);
    }
  }

  /**
   * 情報ログ
   */
  info(message: string, meta?: LogMeta): void {
    if (this.level >= LogLevel.INFO) {
      this.log("INFO", message, meta);
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, meta?: LogMeta): void {
    if (this.level >= LogLevel.DEBUG) {
      this.log("DEBUG", message, meta);
    }
  }

  /**
   * 詳細ログ
   */
  verbose(message: string, meta?: LogMeta): void {
    if (this.level >= LogLevel.VERBOSE) {
      this.log("VERBOSE", message, meta);
    }
  }

  /**
   * ログ出力の実装
   */
  private log(levelName: string, message: string, meta?: LogMeta): void {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : "";
    const metaString = meta ? ` ${JSON.stringify(meta)}` : "";

    const logMessage = `${timestamp} [${levelName}] ${prefix}${message}${metaString}`;

    switch (levelName) {
      case "ERROR":
        console.error(logMessage);
        break;
      case "WARN":
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
        break;
    }
  }

  /**
   * 子ロガーを作成（プレフィックス付き）
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger(this.level, childPrefix);
  }
}

/**
 * グローバルロガーインスタンス
 */
let globalLogger: Logger | null = null;

/**
 * グローバルロガーを初期化
 */
export function initializeLogger(level: LogLevel = LogLevel.INFO): Logger {
  globalLogger = new Logger(level);
  return globalLogger;
}

/**
 * グローバルロガーを取得
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}
