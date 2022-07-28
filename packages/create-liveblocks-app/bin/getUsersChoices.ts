import readline from "readline";
import c from "ansi-colors";
import { CommandLineOptions } from "command-line-args";
import { examplesUrl } from "./config.js";

type Props = {
  flags: CommandLineOptions;
  packageManager: string;
}

// If flags not passed, ask user for info
export async function getUsersChoices({ flags, packageManager }: Props) {
  let example: string;
  let name: string;
  let install: boolean;

  const exampleQuestion = `${c.bold("Which example are you cloning?")} ... `;
  const nameQuestion = `${c.bold("What is your project named?")} ... `;
  const installQuestion = `${c.bold(`Install with ${packageManager}?`)} (y/n) `;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (flags.example) {
    example = flags.example;
  } else {
    console.log("No example specified.");
    console.log();
    console.log("Use command with name of example:");
    console.log(c.bold.cyan("npx create-liveblocks-app nextjs-live-avatars"));
    console.log();
    console.log(c.bold("Find examples here:"));
    console.log(examplesUrl);
    console.log();
    example = await new Promise((res) => {
      rl.question(exampleQuestion, (exampleAnswer) => {
        res(exampleAnswer);
      });
    });
  }

  if (flags.name) {
    name = flags.name;
  } else {
    name = await new Promise((res) => {
      rl.question(nameQuestion, (nameAnswer) => {
        res(nameAnswer);
      });
    });
  }

  if (flags.install) {
    install = true;
  } else if (flags["skip-install"]) {
    install = false;
  } else {
    install = await new Promise((res) => {
      rl.question(installQuestion, (installAnswer) => {
        const isYes = [...installAnswer.trim()].every(char => char.toLowerCase() === "y");
        res(isYes);
      });
    });
  }

  rl.close();

  return { example, name, install };
}
