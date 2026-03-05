import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/mcp-server.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  shims: true,
  external: [
    // Node.js組み込みモジュールを外部化
    "readline",
    "readline/promises",
    "fs",
    "path",
    "child_process",
    "os",
    "util",
  ],
  noExternal: ["@modelcontextprotocol/sdk"],
  bundle: true,
  splitting: false,
  treeshake: true,
});
