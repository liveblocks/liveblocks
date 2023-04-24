import c from "ansi-colors";
import path from "path";
import { confirmDirectoryEmpty } from "../../utils";
import fs from "fs";
import { initPrompts } from "./init-prompts";
import { configGeneration } from "./config-generation";
export async function create(flags: Record<string, any>) {
  const { framework, suspense, typescript } = await initPrompts(flags);

  const appDir = process.cwd();

  // Empty/create appDir repo
  console.log();
  await confirmDirectoryEmpty(appDir);

  const filesToWrite: { location: string; content: string }[] = [];

  const configFileName = "liveblocks.config." + (typescript ? "ts" : "js");
  const configFile = configGeneration({ framework, suspense, typescript });

  // === Add config file ==================================================
  filesToWrite.push({
    location: path.join(appDir, configFileName),
    content: configFile,
  });

  // === Write files, install, set up git ================================
  filesToWrite.forEach(({ location, content }) => {
    fs.writeFileSync(location, content);
  });

  // === Final console messages ==========================================
  console.log(c.bold.magentaBright(`✨ ${configFileName} has been generated!`));
  console.log();
}
