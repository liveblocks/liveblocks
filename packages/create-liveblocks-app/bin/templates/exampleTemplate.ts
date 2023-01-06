import path from "path";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import { cloneRepo } from "../utils/cloneRepo";
import { initializeGit } from "../utils/initializeGit";
import { install as installApp } from "../utils/install";
import { getPackageManager } from "../utils/getPackageManager";
import { confirmDirectoryEmpty } from "../utils/confirmDirectoryEmpty";
import { getBuildCommand, getDevCommand } from "../utils/getCommand";
import fs from "fs";

export const EXAMPLES_REPO_LOCATION = "liveblocks/liveblocks/examples/";
export const EXAMPLES_URL =
  "https://github.com/liveblocks/liveblocks/tree/main/examples";

type Questions = {
  example: string;
  name: string;
  git: boolean;
  install: boolean;
};

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();

  const questions: PromptObject<keyof Questions>[] = [
    {
      type: flags.example ? null : "text",
      name: "example",
      message: `Name of the example you're cloning (e.g. nextjs-live-avatars)?
  ${c.magentaBright(EXAMPLES_URL)}`,
    },
    {
      type: flags.name ? null : "text",
      name: "name",
      message: "What would you like to name your project directory?",
    },
    {
      type: flags.git !== undefined ? null : "confirm",
      name: "git",
      message: "Would you like to initialize a new git repository?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
    {
      type: flags.install !== undefined ? null : "confirm",
      name: "install",
      message: `Would you like to install with ${packageManager}?`,
      initial: true,
      active: "yes",
      inactive: "no",
    },
  ];

  const {
    example = flags.example,
    name = flags.name,
    git = flags.git,
    install = flags.install,
  }: Questions = await prompts(questions, {
    onCancel: () => {
      console.log(c.redBright.bold("  Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  const repoDir = EXAMPLES_REPO_LOCATION + example;
  const appDir = path.join(process.cwd(), "./" + name);

  await confirmDirectoryEmpty(appDir);
  const result = await cloneRepo({ repoDir, appDir });

  if (!result) {
    return;
  }

  if (install) {
    await installApp({
      appDir: appDir,
      packageManager: packageManager,
    });
  }

  if (git) {
    await initializeGit({ appDir });
  }

  // Check which command to start developing
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  const devCommand = getDevCommand(packageJson?.scripts || {});
  const buildCommand = getBuildCommand(packageJson?.scripts || {});

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
