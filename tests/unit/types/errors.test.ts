import { describe, it, expect } from "vitest";
import {
  GA4AnalyzerError,
  ConfigurationError,
  AuthenticationError,
  ApiError,
  QuotaExceededError,
  NetworkError,
  ParseError,
} from "@/types/errors";

describe("Error Classes", () => {
  describe("GA4AnalyzerError", () => {
    it("should create error with message", () => {
      const error = new GA4AnalyzerError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("GA4AnalyzerError");
      expect(error).toBeInstanceOf(Error);
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new GA4AnalyzerError("Wrapped error", cause);
      expect(error.message).toBe("Wrapped error");
      expect(error.cause).toBe(cause);
    });

    it("should have stack trace", () => {
      const error = new GA4AnalyzerError("Test error");
      expect(error.stack).toBeDefined();
    });
  });

  describe("ConfigurationError", () => {
    it("should create configuration error", () => {
      const error = new ConfigurationError("Config not found");
      expect(error.message).toBe("Config not found");
      expect(error.name).toBe("ConfigurationError");
      expect(error).toBeInstanceOf(GA4AnalyzerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should create configuration error with cause", () => {
      const cause = new Error("File not found");
      const error = new ConfigurationError("Config failed", cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe("AuthenticationError", () => {
    it("should create authentication error", () => {
      const error = new AuthenticationError("Invalid credentials");
      expect(error.message).toBe("Invalid credentials");
      expect(error.name).toBe("AuthenticationError");
      expect(error).toBeInstanceOf(GA4AnalyzerError);
    });
  });

  describe("ApiError", () => {
    it("should create API error", () => {
      const error = new ApiError("API request failed");
      expect(error.message).toBe("API request failed");
      expect(error.name).toBe("ApiError");
      expect(error).toBeInstanceOf(GA4AnalyzerError);
    });
  });

  describe("QuotaExceededError", () => {
    it("should create quota exceeded error with default message", () => {
      const error = new QuotaExceededError();
      expect(error.message).toBe("GA4 APIのクォータを超過しました");
      expect(error.name).toBe("QuotaExceededError");
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should create quota exceeded error with custom message", () => {
      const error = new QuotaExceededError("Custom quota message");
      expect(error.message).toBe("Custom quota message");
    });
  });

  describe("NetworkError", () => {
    it("should create network error with default message", () => {
      const error = new NetworkError();
      expect(error.message).toBe("ネットワークエラーが発生しました");
      expect(error.name).toBe("NetworkError");
      expect(error).toBeInstanceOf(ApiError);
    });

    it("should create network error with custom message", () => {
      const error = new NetworkError("Connection timeout");
      expect(error.message).toBe("Connection timeout");
    });
  });

  describe("ParseError", () => {
    it("should create parse error", () => {
      const error = new ParseError("Failed to parse query");
      expect(error.message).toBe("Failed to parse query");
      expect(error.name).toBe("ParseError");
      expect(error).toBeInstanceOf(GA4AnalyzerError);
    });
  });

  describe("Error hierarchy", () => {
    it("should maintain correct inheritance chain", () => {
      const configError = new ConfigurationError("Config error");
      const authError = new AuthenticationError("Auth error");
      const apiError = new ApiError("API error");
      const quotaError = new QuotaExceededError();
      const networkError = new NetworkError();
      const parseError = new ParseError("Parse error");

      // すべてGA4AnalyzerErrorを継承
      expect(configError).toBeInstanceOf(GA4AnalyzerError);
      expect(authError).toBeInstanceOf(GA4AnalyzerError);
      expect(apiError).toBeInstanceOf(GA4AnalyzerError);
      expect(quotaError).toBeInstanceOf(GA4AnalyzerError);
      expect(networkError).toBeInstanceOf(GA4AnalyzerError);
      expect(parseError).toBeInstanceOf(GA4AnalyzerError);

      // QuotaExceededErrorとNetworkErrorはApiErrorを継承
      expect(quotaError).toBeInstanceOf(ApiError);
      expect(networkError).toBeInstanceOf(ApiError);

      // すべてErrorを継承
      expect(configError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(Error);
      expect(apiError).toBeInstanceOf(Error);
      expect(quotaError).toBeInstanceOf(Error);
      expect(networkError).toBeInstanceOf(Error);
      expect(parseError).toBeInstanceOf(Error);
    });
  });

  describe("Error identification", () => {
    it("should identify error types using instanceof", () => {
      const errors = [
        new ConfigurationError("Config"),
        new AuthenticationError("Auth"),
        new ApiError("API"),
        new QuotaExceededError(),
        new NetworkError(),
        new ParseError("Parse"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(GA4AnalyzerError);
      });

      expect(errors[0]).toBeInstanceOf(ConfigurationError);
      expect(errors[1]).toBeInstanceOf(AuthenticationError);
      expect(errors[2]).toBeInstanceOf(ApiError);
      expect(errors[3]).toBeInstanceOf(QuotaExceededError);
      expect(errors[4]).toBeInstanceOf(NetworkError);
      expect(errors[5]).toBeInstanceOf(ParseError);
    });

    it("should identify error types using name property", () => {
      expect(new ConfigurationError("").name).toBe("ConfigurationError");
      expect(new AuthenticationError("").name).toBe("AuthenticationError");
      expect(new ApiError("").name).toBe("ApiError");
      expect(new QuotaExceededError().name).toBe("QuotaExceededError");
      expect(new NetworkError().name).toBe("NetworkError");
      expect(new ParseError("").name).toBe("ParseError");
    });
  });
});
