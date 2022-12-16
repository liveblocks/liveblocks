import path from "path";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import { cloneRepo } from "../utils/cloneRepo.js";
import { initializeGit } from "../utils/initializeGit.js";
import { install as installApp } from "../utils/install.js";
import { getPackageManager } from "../utils/getPackageManager.js";
import { confirmDirectoryEmpty } from "../utils/confirmDirectoryEmpty";

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
      message: "Would you like to install?",
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

  const packageManager = flags.packageManager || getPackageManager();

  if (install) {
    await installApp({
      appDir: appDir,
      packageManager: packageManager,
    });
  } else {
    console.log(c.yellowBright("Skipping install..."));
  }

  if (git) {
    await initializeGit({ appDir });
  }

  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  let instructionCount = 1;

  console.log(`
${c.bold("Start developing by typing:")}
 ${instructionCount++}: ${c.cyanBright(`cd ${name}`)}${
    !install
      ? c.cyanBright(`
 ${instructionCount++}: ${packageManager} install`)
      : ""
  }
 ${instructionCount++}: ${c.cyanBright(`${cmd} dev`)}

✨ ${c.bold.magentaBright("Ready to collaborate!")}`);
}
