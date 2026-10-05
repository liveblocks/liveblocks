import { config as loadEnv } from "dotenv";

import { HELP, parseConfig } from "./config.ts";
import { runLoad } from "./runner.ts";

loadEnv({ path: ".env.local" });

try {
  const config = parseConfig(process.argv.slice(2));
  if (!config) console.log(HELP);
  else process.exitCode = await runLoad(config);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
