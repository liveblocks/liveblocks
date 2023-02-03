import { execSync } from "child_process";
import prompts, { PromptObject } from "prompts";

type Question = {
  confirmNestedRepo: boolean;
};

export async function checkIfInsideRepo(appDir: string): Promise<boolean> {
  let insideRepo;
  try {
    const result = execSync("git rev-parse --is-inside-work-tree", {
      cwd: appDir,
      encoding: "utf-8",
    });
    insideRepo = result === "true";
  } catch (err) {
    // Error means not inside a repo
    insideRepo = false;

    // Remove git error message
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
  }

  if (insideRepo) {
    const question: PromptObject<keyof Question> = {
      name: "confirmNestedRepo",
      type: "confirm",
      message: `Directory is already inside a git repository, continue anyway?`,
      initial: true,
      active: "yes",
      inactive: "no",
    };

    const { confirmNestedRepo = true }: Question = await prompts([question]);
    return confirmNestedRepo;
  }

  return true;
}
