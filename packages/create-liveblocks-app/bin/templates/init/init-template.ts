import c from "ansi-colors";
import path from "path";
import fs from "fs";
import { initPrompts } from "./init-prompts";
import { REACT_CONFIG, JAVASCRIPT_CONFIG } from "./config-file";

export async function create(flags: Record<string, any>) {
  const { framework } = await initPrompts(flags);

  const appDir = process.cwd();
  const configFileName = "liveblocks.config.ts";

  const filesToWrite: { location: string; content: string }[] = [];

  // === Add config file ==================================================
  filesToWrite.push({
    location: path.join(appDir, configFileName),
    content: framework === "react" ? REACT_CONFIG : JAVASCRIPT_CONFIG,
  });

  // === Write files, install, set up git ================================
  filesToWrite.forEach(({ location, content }) => {
    fs.writeFileSync(location, content);
  });

  // === Final console messages ==========================================
  console.log();
  console.log(c.bold.magentaBright(`✨ ${configFileName} has been generated!`));
  console.log();
}
