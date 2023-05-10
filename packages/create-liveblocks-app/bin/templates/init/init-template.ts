import c from "ansi-colors";
import path from "path";
import fs from "fs";
import { initPrompts } from "./init-prompts";
import { configGeneration } from "./config-generation";
export async function create(flags: Record<string, any>) {
  const { framework, suspense, typescript, comments } = await initPrompts(
    flags
  );

  const appDir = process.cwd();

  const filesToWrite: { location: string; content: string }[] = [];

  const configFileName = "liveblocks.config." + (typescript ? "ts" : "js");
  const configFile = configGeneration({
    framework,
    suspense,
    typescript,
    comments,
  });

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
  console.log();
  console.log(c.bold.magentaBright(`✨ ${configFileName} has been generated!`));
  console.log();
}
