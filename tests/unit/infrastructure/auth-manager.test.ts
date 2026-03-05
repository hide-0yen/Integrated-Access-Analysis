import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthenticationManager } from "@/infrastructure/auth-manager";
import { AuthenticationError, ConfigurationError } from "@/types/errors";
import { GoogleAuth } from "google-auth-library";

// GoogleAuthをモック
vi.mock("google-auth-library", () => {
  const MockGoogleAuth = vi.fn().mockImplementation((config) => {
    return {
      getClient: vi.fn().mockResolvedValue({
        getAccessToken: vi.fn().mockResolvedValue({ token: "mock-token" }),
      }),
      _config: config,
    };
  });

  return {
    GoogleAuth: MockGoogleAuth,
  };
});

describe("AuthenticationManager", () => {
  let manager: AuthenticationManager;

  beforeEach(() => {
    manager = new AuthenticationManager();
    vi.clearAllMocks();
  });

  describe("正常系: loadCredentials", () => {
    it("should load credentials from service account key file", () => {
      const config = {
        serviceAccountKeyPath: "/path/to/service-account-key.json",
      };

      const credentials = manager.loadCredentials(config);

      expect(credentials).toBeInstanceOf(GoogleAuth);
      expect(GoogleAuth).toHaveBeenCalledWith({
        keyFile: "/path/to/service-account-key.json",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      });
    });

    it("should load credentials using Application Default Credentials", () => {
      const config = {
        useApplicationDefaultCredentials: true,
      };

      const credentials = manager.loadCredentials(config);

      expect(credentials).toBeInstanceOf(GoogleAuth);
      expect(GoogleAuth).toHaveBeenCalledWith({
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      });
    });

    it("should prioritize serviceAccountKeyPath over ADC", () => {
      const config = {
        serviceAccountKeyPath: "/path/to/key.json",
        useApplicationDefaultCredentials: true,
      };

      manager.loadCredentials(config);

      expect(GoogleAuth).toHaveBeenCalledWith({
        keyFile: "/path/to/key.json",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      });
    });
  });

  describe("異常系: loadCredentials", () => {
    it("should throw ConfigurationError when no credentials are provided", () => {
      const config = {};

      expect(() => manager.loadCredentials(config)).toThrow(ConfigurationError);
      expect(() => manager.loadCredentials(config)).toThrow(
        "認証情報が設定されていません",
      );
    });

    // Note: GoogleAuthのコンストラクタエラーはモックが難しいため、
    // 実際のファイル読み込みエラーなどは統合テストでカバーする
  });

  describe("正常系: validateCredentials", () => {
    it("should return true for valid credentials", async () => {
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: "test-token" });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      const mockAuth = {
        getClient: mockGetClient,
      } as unknown as GoogleAuth;

      const result = await manager.validateCredentials(mockAuth);

      expect(result).toBe(true);
    });

    it("should call getClient and getAccessToken", async () => {
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: "test-token" });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });

      const mockAuth = {
        getClient: mockGetClient,
      } as unknown as GoogleAuth;

      await manager.validateCredentials(mockAuth);

      expect(mockGetClient).toHaveBeenCalledTimes(1);
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("異常系: validateCredentials", () => {
    it("should return false when getClient fails", async () => {
      const mockAuth = {
        getClient: vi.fn().mockRejectedValue(new Error("Client error")),
      } as unknown as GoogleAuth;

      const result = await manager.validateCredentials(mockAuth);

      expect(result).toBe(false);
    });

    it("should return false when getAccessToken fails", async () => {
      const mockAuth = {
        getClient: vi.fn().mockResolvedValue({
          getAccessToken: vi.fn().mockRejectedValue(new Error("Token error")),
        }),
      } as unknown as GoogleAuth;

      const result = await manager.validateCredentials(mockAuth);

      expect(result).toBe(false);
    });

    it("should return false for network errors", async () => {
      const mockAuth = {
        getClient: vi.fn().mockResolvedValue({
          getAccessToken: vi
            .fn()
            .mockRejectedValue(new Error("Network unreachable")),
        }),
      } as unknown as GoogleAuth;

      const result = await manager.validateCredentials(mockAuth);

      expect(result).toBe(false);
    });

    it("should return false for authentication errors", async () => {
      const mockAuth = {
        getClient: vi.fn().mockResolvedValue({
          getAccessToken: vi
            .fn()
            .mockRejectedValue(new Error("Invalid credentials")),
        }),
      } as unknown as GoogleAuth;

      const result = await manager.validateCredentials(mockAuth);

      expect(result).toBe(false);
    });
  });

  describe("認証スコープ", () => {
    it("should use analytics.readonly scope", () => {
      const config = {
        serviceAccountKeyPath: "/path/to/key.json",
      };

      manager.loadCredentials(config);

      expect(GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        }),
      );
    });
  });

  describe("境界値テスト", () => {
    it("should treat empty service account key path as no credentials", () => {
      const config = {
        serviceAccountKeyPath: "",
      };

      // 空文字列はfalsy値として扱われるため、ConfigurationErrorになる
      expect(() => manager.loadCredentials(config)).toThrow(ConfigurationError);
    });

    it("should handle very long service account key path", () => {
      const longPath = "/very/long/path/".repeat(50) + "key.json";
      const config = {
        serviceAccountKeyPath: longPath,
      };

      const credentials = manager.loadCredentials(config);
      expect(credentials).toBeInstanceOf(GoogleAuth);
    });
  });
});
