#!/usr/bin/env node
/**
 * GA4 Analyzer MCP Server
 * MCPサーバー起動スクリプト
 */

import { startMCPServer } from "../src/mcp/server.js";

// エラーハンドリング
process.on("uncaughtException", (error) => {
  console.error("[MCP Server] Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[MCP Server] Unhandled rejection at:",
    promise,
    "reason:",
    reason,
  );
  process.exit(1);
});

// MCPサーバーを起動
startMCPServer().catch((error: unknown) => {
  console.error("[MCP Server] Failed to start:", error);
  process.exit(1);
});
