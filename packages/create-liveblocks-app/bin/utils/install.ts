import c from "ansi-colors";
import { PackageManager } from "./getPackageManager.js";
import { loadingSpinner } from "./loadingSpinner.js";
import { execAsync } from "./execAsync.js";

type Props = {
  packageManager: PackageManager;
  appDir: string;
};

export async function install({ packageManager, appDir }: Props) {
  const spinner = loadingSpinner().start(
    `Installing with ${packageManager}...`
  );

  try {
    await execAsync(`${packageManager} install`, {
      cwd: appDir,
    });
  } catch (err) {
    spinner.fail(c.redBright.bold("Problem during installation"));
    console.log(err);
    return;
  }

  spinner.succeed(c.green(`Installed with ${packageManager}!`));
}
