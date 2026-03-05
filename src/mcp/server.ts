/**
 * GA4 Analyzer MCP Server
 * Model Context Protocol サーバーのメインエントリポイント
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_INFO } from "./config.js";
import { registerTools } from "./tools/index.js";

/**
 * MCPサーバーを初期化して起動
 */
export async function startMCPServer(): Promise<void> {
  // MCPサーバーインスタンス作成
  const server = new McpServer(
    {
      name: MCP_SERVER_INFO.name,
      version: MCP_SERVER_INFO.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ツールを登録
  const tools = registerTools();

  // 各ツールをMCPサーバーに登録
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        // ツールハンドラーを実行
        const result = await tool.handler(args);

        // 結果をMCPレスポンス形式に変換
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  // Stdio transportで接続
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // サーバー起動ログ（stderr経由で出力）
  console.error(
    `[MCP Server] ${MCP_SERVER_INFO.name} v${MCP_SERVER_INFO.version} started`,
  );
  console.error(
    `[MCP Server] Registered ${String(tools.length)} tools: ${tools.map((t) => t.name).join(", ")}`,
  );
}
