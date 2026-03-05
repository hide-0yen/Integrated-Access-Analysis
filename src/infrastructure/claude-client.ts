import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude Client設定
 */
export interface ClaudeClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

/**
 * ClaudeClient
 *
 * Anthropic Claude APIとの通信を管理する
 */
export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model ?? "claude-3-5-haiku-20241022";
    this.maxTokens = config.maxTokens ?? 1024;
  }

  /**
   * Claudeにメッセージを送信
   */
  async sendMessage(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude API");
      }

      return content.text;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `Claude API error: ${String(error.status)} - ${error.message}`,
        );
      }
      throw error;
    }
  }
}
