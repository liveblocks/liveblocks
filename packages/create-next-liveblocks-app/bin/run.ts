import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import readline from "readline";
import { join } from "path";
import commandLineArgs from "command-line-args";
import c from "ansi-colors";
import { cloneRepo } from "./cloneRepo.js";
import { commandLineFlags, getTemplatePath } from "./config.js";
import getPackageManager from "./getPackageManager.js";
import { getDependencies } from "./getDependencies.js";

export async function run () {
  console.log(c.redBright(` 
▀█████▀  ▄              
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
  `));
  console.log(c.bold.bgRed(" Liveblocks "));

  console.log(c.gray("___"));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const name = await new Promise((res) => {
    rl.question(c.bold("What is your project named? "), (name) => {
      res(name);
    });
  });
  rl.close();

  console.log(c.gray("___"));
  console.log();

  const packageManager = getPackageManager();
  const flags = commandLineArgs(commandLineFlags);
  const repoDir = getTemplatePath(flags);
  const appDir = join(process.cwd(), "./" + name);

  if (!existsSync(appDir)) {
    mkdirSync(appDir);
  }

  const cloneRepoSuccess = await cloneRepo(repoDir, appDir);
  if (!cloneRepoSuccess) {
    return;
  }

  const deps = getDependencies(appDir);
  if (!deps) {
    return;
  }

  console.log(c.gray("___"));
  console.log();

  if (!flags["skip-install"]) {

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

${c.bold.cyanBright(`cd ${name}`)}${flags["skip-install"] ? c.bold.cyanBright(`
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
