import path from "path";
import c from "ansi-colors";
import {
  cloneRepo,
  initializeGit,
  install as installApp,
  confirmDirectoryEmpty,
  getBuildCommand,
  getDevCommand,
  getPackageManager,
} from "../../utils";
import fs from "fs";
import { EXAMPLES_REPO_LOCATION } from "../constants";
import { examplePrompts } from "./example-prompts";

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();
  const { example, name, git, install } = await examplePrompts(flags);

  // === Clone example repo ==============================================
  const repoDir = EXAMPLES_REPO_LOCATION + example;
  const appDir = path.join(process.cwd(), "./" + name);

  await confirmDirectoryEmpty(appDir);
  const result = await cloneRepo({ repoDir, appDir });

  if (!result) {
    console.log();
    console.log(c.redBright.bold("Target repo is empty"));
    console.log();
    return;
  }

  // === Install and set up git ==========================================
  if (install) {
    await installApp({
      appDir: appDir,
      packageManager: packageManager,
    });
  }

  if (git) {
    await initializeGit({ appDir });
  }

  // === Check which command will start dev server from package.json =====
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  const devCommand = getDevCommand(packageJson?.scripts || {});
  const buildCommand = getBuildCommand(packageJson?.scripts || {});

  // === Final console messages ==========================================
  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  let instructionCount = 1;

  console.log(`
${c.bold(`Start ${devCommand ? "developing " : ""}by typing:`)}
 ${instructionCount++}: ${c.cyanBright(`cd ${name}`)}${
    !install
      ? c.cyanBright(`
 ${instructionCount++}: ${packageManager} install`)
      : ""
  }`);

  if (devCommand || buildCommand) {
    console.log(
      ` ${instructionCount++}: ${c.cyanBright(
        `${cmd} ${devCommand || buildCommand}`
      )}`
    );
  }

  console.log();
  console.log(c.bold.magentaBright("✨ Ready to collaborate!"));
  console.log();
}
