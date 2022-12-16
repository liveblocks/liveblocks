import fs from "fs";
import path from "path";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import { loadingSpinner } from "./loadingSpinner";

type Question = {
  confirmDelete: boolean;
};

export async function confirmDirectoryEmpty(dir: string) {
  // Directory does not exist or already empty, skip function
  if (!fs.existsSync(dir) || fs.readdirSync(dir).length === 0) {
    console.log();
    return false;
  }

  const dirName = path.parse(dir).name;
  const question: PromptObject<keyof Question> = {
    name: "confirmDelete",
    type: "confirm",
    message: `Target directory "${dirName}" is not empty, delete files and continue?`,
    initial: true,
    active: "yes",
    inactive: "no",
  };

  const { confirmDelete = false }: Question = await prompts([question]);

  if (!confirmDelete) {
    console.log(
      c.redBright.bold(`Target directory "${dirName}" is not empty, cancelling`)
    );
    console.log();
    process.exit(0);
  }

  console.log();
  const spinner = loadingSpinner().start("Clearing directory...");
  fs.rmSync(dir, { recursive: true, force: true });
  spinner.succeed(c.green("Directory cleared!"));
  return true;
}
