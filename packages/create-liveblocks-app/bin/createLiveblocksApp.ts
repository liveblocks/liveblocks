import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import commandLineArgs, { OptionDefinition } from "command-line-args";
import c from "ansi-colors";
import { cloneRepo } from "./cloneRepo.js";
import getPackageManager from "./getPackageManager.js";
import { getDependencies } from "./getDependencies.js";
import { getUsersChoices } from "./getUsersChoices.js";
import { examplesLocation } from "./config.js";

const commandLineFlags: OptionDefinition[] = [
  {
    name: "example",
    type: String,
    defaultOption: true,
  },
  {
    name: "name",
    type: String,
  },
  {
    name: "install",
    type: Boolean,
  },
  {
    name: "skip-install",
    type: Boolean,
  }
];

export async function createLiveblocksApp() {
  console.log(c.redBright(` 
▀█████▀  ▄              
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
  `));
  console.log(c.bold.bgRed(" Liveblocks "));

  console.log(c.gray("___"));
  console.log();

  const packageManager = getPackageManager();
  const flags = commandLineArgs(commandLineFlags);

  const { example, name, install } = await getUsersChoices({ flags, packageManager });

  console.log(c.gray("___"));
  console.log();

  const repoDir = `${examplesLocation}${example}`;
  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const cloneRepoSuccess = await cloneRepo({ repoDir, appDir });
  if (!cloneRepoSuccess) {
    return;
  }

  const deps = getDependencies({ appDir });
  if (!deps) {
    return;
  }

  console.log(c.gray("___"));
  console.log();

  if (install) {
    console.log(`Installing dependencies with ${packageManager}:`);

    Object.keys(deps).forEach((dep) => {
      console.log(c.yellowBright(`- ${dep}`));
    });
    console.log(c.gray("___"));
    console.log();

    execSync(`${packageManager} install`, {
      cwd: appDir,
      stdio: "inherit",
    });

    console.log(c.gray("___"));
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
