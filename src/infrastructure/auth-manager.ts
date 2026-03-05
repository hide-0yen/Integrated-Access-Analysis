/**
 * AuthenticationManager
 * Google Cloud認証の管理
 */

import { GoogleAuth } from "google-auth-library";
import { AuthenticationError, ConfigurationError } from "@/types/errors";
import { AuthConfig } from "@/types/models";

/**
 * AuthenticationManagerクラス
 */
export class AuthenticationManager {
  /**
   * 認証情報を読み込む
   */
  loadCredentials(config: AuthConfig): GoogleAuth {
    try {
      if (config.serviceAccountKeyPath) {
        // サービスアカウントキーファイルから認証
        const auth = new GoogleAuth({
          keyFile: config.serviceAccountKeyPath,
          scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        });
        return auth;
      } else if (config.useApplicationDefaultCredentials) {
        // Application Default Credentials(ADC)を使用
        const auth = new GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        });
        return auth;
      } else {
        throw new ConfigurationError("認証情報が設定されていません");
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new AuthenticationError("認証情報の読み込みに失敗しました", error);
    }
  }

  /**
   * 認証情報を検証する
   */
  async validateCredentials(credentials: GoogleAuth): Promise<boolean> {
    try {
      const client = await credentials.getClient();
      await client.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
