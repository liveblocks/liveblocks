import fs from "fs";
import path from "path";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import { cloneRepo } from "../cloneRepo.js";
import { initializeGit } from "../initializeGit.js";
import { install as installApp } from "../install.js";
import { getPackageManager } from "../getPackageManager.js";

// TODO change to "liveblocks/liveblocks/starter-kits/nextjs-starter-kit"
const NEXTJS_STARTER_KIT_REPO = "CTNicholas/liveblocks-live-piano-next-js";

type Questions = {
  name: string;
  auth: boolean;
  prettier: boolean;
  git: boolean;
  install: boolean;
};

export async function create(flags: Record<string, any>) {
  const questions: PromptObject<keyof Questions>[] = [
    {
      type: flags.name ? null : "text",
      name: "name",
      message: "Where would you like to create your project?",
    },
    {
      // TODO after guide
      type: null, // "toggle",
      name: "auth",
      message: "Would you like to set up authentication?",
      initial: false,
      active: "yes",
      inactive: "no",
    },
    {
      type: flags.git !== undefined ? null : "confirm",
      name: "git",
      message: "Would you like to initialize a new git repository?",
      initial: true,
      active: "yes",
      inactive: "no"
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

  let cancelInstall = false;

  const {
    name = flags.name,
    // TODO after guide
    // auth,
    git = flags.git,
    install = flags.install,
  }: Questions = await prompts(questions, { onCancel: () => cancelInstall = true });

  console.log();

  if (cancelInstall) {
    console.log();
    console.log(c.redBright.bold("Cancelled"));
    return;
  }

  const repoDir = NEXTJS_STARTER_KIT_REPO;
  const appDir = path.join(process.cwd(), "./" + name);
  const result = await cloneRepo({ repoDir, appDir });

  if (!result) {
    return;
  }

  const packageManager = flags.packageManager || getPackageManager();
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  const filesToWrite: { location: string; content: string }[] = [];
  let envVariables = ["LIVEBLOCKS_SECRET_KEY"];

  filesToWrite.push({
    location: path.join(appDir, ".env.local"),
    content: envVariables.map((envVariable) => `${envVariable}=`).join("\n"),
  });

  filesToWrite.push({
    location: packageJsonLocation,
    content: JSON.stringify(packageJson, null, 2),
  });

  filesToWrite.forEach(({ location, content }) => {
    fs.writeFileSync(location, content);
  });

  if (install) {
    await installApp({
      appDir: appDir,
      packageManager: packageManager,
    });
  }

  if (git) {
    await initializeGit({ appDir });
  }

  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  let instructionCount = 1;

  console.log();
  console.log(c.bold("Start using the Next.js Starter Kit by typing:"));

  console.log(` ${instructionCount++}: ${c.cyanBright(`cd ${name}`)}${!install ? `
 ${instructionCount++}: ${c.cyanBright(`${packageManager} install`)}` : ""}
 ${instructionCount++}: ${c.cyanBright(`${cmd} dev`)}`);

  console.log();
  console.log(c.bold.magentaBright("✨ Ready to collaborate!"));

  // TODO check README URL is correct after starter kit merged to main repo
  // TODO change for guide on liveblocks.io when complete
  console.log();
  console.log(c.bold("Make sure to read the guide to set up your app:"));
  console.log("https://github.com/liveblocks/liveblocks/blob/main/starter-kits/nextjs-starter-kit/README.md");
}
