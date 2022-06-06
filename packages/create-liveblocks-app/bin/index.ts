import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import commandLineArgs, { OptionDefinition } from "command-line-args";
import c from "ansi-colors";
import { cloneRepo } from "./cloneRepo.js";
import getPackageManager from "./getPackageManager.js";
import { getDependencies } from "./getDependencies.js";
import { askQuestions } from "./askQuestions";

const base = "liveblocks/liveblocks/examples/";
const baseUrl = "https://github.com/liveblocks/liveblocks/tree/main/examples";

export const commandLineFlags: OptionDefinition[] = [
  {
    name: "example",
    type: String,
    defaultOption: true,
  },
];

index();

export async function index() {
  console.log(c.redBright(` 
▀█████▀  ▄              
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
  `));
  console.log(c.bold.bgRed(" Liveblocks "));

  console.log(c.gray("___"));
  console.log();

  const { name, install } = await askQuestions();

  console.log(c.gray("___"));
  console.log();

  const packageManager = getPackageManager();
  const flags = commandLineArgs(commandLineFlags);
  console.log(flags);
  if (!flags.example) {
    console.log("No example specified.");
    console.log();
    console.log("Use with name of example:");
    console.log(c.bold.cyan("npx create-liveblocks-app nextjs-live-avatars"));
    console.log();
    console.log(c.bold("Find examples here:"));
    console.log(baseUrl);
    console.log();
    return;
  }

  const repoDir = `${base}${flags.example}`;
  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const cloneRepoSuccess = await cloneRepo({ repoDir, appDir, baseUrl });
  if (!cloneRepoSuccess) {
    return;
  }

  const deps = getDependencies(appDir);
  if (!deps) {
    return;
  }

  console.log(c.gray("___"));
  console.log();

  if (install) {
    console.log(`Installing dependencies with ${packageManager}:`);

    Object.keys(deps).forEach((dep) => {
      console.log(c.gray(`- ${dep}`));
    });
    console.log(c.gray("___"));
    console.log();

    execSync(`${packageManager} install`, {
      cwd: appDir,
      stdio: "inherit",
    });

    console.log(c.gray("___"));
    console.log();
  } else {
    console.log(c.yellowBright("Skipping install..."));
  }

  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;

  console.log(` 
${c.bold("✨ Success!")}

${c.bold("Liveblocks starter created at:")} 
${c.greenBright(appDir)}
${c.gray("___")}

Inside the directory you can run several commands:

${c.bold.cyanBright(`${cmd} dev`)}
  Start the dev server
  
${c.bold.cyanBright(`${cmd} build`)}
  Builds the app for production.
  
${c.bold.cyanBright(`${cmd} start`)}
  Runs the built app in production mode.
${c.gray("___")}

Start developing by typing:

${c.bold.cyanBright(`cd ${name}`)}${!install ? c.bold.cyanBright(`
${packageManager} install`) : ""}
${c.bold.cyanBright(`${cmd} dev`)}
  `);
}

/*
// Probably too tacky
const logo = c.redBright(`
░█░░░▀█▀░█░█░█▀▀░█▀▄░█░░░█▀█░█▀▀░█░█░█▀▀
░█░░░░█░░▀▄▀░█▀▀░█▀▄░█░░░█░█░█░░░█▀▄░▀▀█
░▀▀▀░▀▀▀░░▀░░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀
`);

// Too much?
const logo = c.bright(`
▀█████▀  ▄     ░█░░░▀█▀░█░█░█▀▀░█▀▄░█░░░█▀█░█▀▀░█░█░█▀▀
 ▀██▀  ▄██▄    ░█░░░░█░░▀▄▀░█▀▀░█▀▄░█░░░█░█░█░░░█▀▄░▀▀█
  ▀  ▄█████▄   ░▀▀▀░▀▀▀░░▀░░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀
`):

// Too large
const logo = c.redBright(`
 ▀████████▀ ▄
  ▀█████▀ ▄██▄
   ▀██▀ ▄█████▄
    ▀ ▄████████▄
`);
 */
