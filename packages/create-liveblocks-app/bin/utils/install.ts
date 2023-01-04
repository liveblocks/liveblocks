import c from "ansi-colors";
import { PackageManager } from "./getPackageManager";
import { loadingSpinner } from "./loadingSpinner";
import { execAsync } from "./execAsync";

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
    spinner.fail(c.redBright.bold("Problem during installation:"));
    console.log();
    console.log(err);
    console.log();
    process.exit(0);
  }

  spinner.succeed(c.green(`Installed with ${packageManager}!`));
}
