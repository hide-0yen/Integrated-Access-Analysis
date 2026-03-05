import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeClient } from "@/infrastructure/claude-client";
import Anthropic from "@anthropic-ai/sdk";

// Anthropic SDKをモック化
vi.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = vi.fn();
  MockAnthropic.prototype.messages = {
    create: vi.fn(),
  };
  MockAnthropic.APIError = class APIError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
      this.name = "APIError";
    }
  };
  return { default: MockAnthropic };
});

describe("ClaudeClient", () => {
  let client: ClaudeClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ClaudeClient({
      apiKey: "test-api-key",
    });
    mockCreate = (Anthropic.prototype.messages as { create: typeof vi.fn })
      .create;
  });

  describe("正常系", () => {
    it("メッセージ送信が成功する", async () => {
      const mockResponse = {
        content: [{ type: "text", text: "テストレスポンス" }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await client.sendMessage("テストプロンプト");

      expect(result).toBe("テストレスポンス");
      expect(mockCreate).toHaveBeenCalledWith({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: "テストプロンプト" }],
      });
    });

    it("カスタムモデルとmax_tokensを使用できる", async () => {
      const customClient = new ClaudeClient({
        apiKey: "test-api-key",
        model: "claude-3-opus-20240229",
        maxTokens: 2048,
      });
      const mockCreateCustom = (
        Anthropic.prototype.messages as { create: typeof vi.fn }
      ).create;
      const mockResponse = {
        content: [{ type: "text", text: "カスタムレスポンス" }],
      };
      mockCreateCustom.mockResolvedValue(mockResponse);

      await customClient.sendMessage("カスタムプロンプト");

      expect(mockCreateCustom).toHaveBeenCalledWith({
        model: "claude-3-opus-20240229",
        max_tokens: 2048,
        messages: [{ role: "user", content: "カスタムプロンプト" }],
      });
    });
  });

  describe("異常系", () => {
    it("APIエラーを適切にハンドリングする", async () => {
      const apiError = new (Anthropic.APIError as unknown as new (
        message: string,
        status: number,
      ) => Error)("Rate limit exceeded", 429);
      mockCreate.mockRejectedValue(apiError);

      await expect(client.sendMessage("テスト")).rejects.toThrow(
        "Claude API error: 429 - Rate limit exceeded",
      );
    });

    it("不正なレスポンスタイプでエラーを投げる", async () => {
      const mockResponse = {
        content: [{ type: "image", source: { type: "base64", data: "" } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await expect(client.sendMessage("テスト")).rejects.toThrow(
        "Unexpected response type from Claude API",
      );
    });

    it("一般的なエラーをそのまま投げる", async () => {
      const genericError = new Error("Network error");
      mockCreate.mockRejectedValue(genericError);

      await expect(client.sendMessage("テスト")).rejects.toThrow(
        "Network error",
      );
    });
  });
});
