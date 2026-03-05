#!/usr/bin/env node

/**
 * GA4 Analyzer CLI Entry Point
 */

import { CLIHandler } from "../presentation/cli-handler";

async function main(): Promise<void> {
  const handler = new CLIHandler();
  const exitCode = await handler.run(process.argv);
  process.exit(exitCode);
}

main().catch((error: unknown) => {
  console.error("❌ 予期しないエラーが発生しました");
  console.error(error);
  process.exit(1);
});
