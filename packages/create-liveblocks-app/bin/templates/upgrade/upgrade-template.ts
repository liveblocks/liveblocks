import c from "ansi-colors";
import { detect } from "detect-package-manager";
import execa from "execa";
import { PackageJson, readPackage } from "read-pkg";

function findLiveblocksDependencies(
  dependencies?: Partial<Record<string, string>>
) {
  return Object.keys(dependencies ?? {}).filter((dependency) =>
    dependency?.startsWith("@liveblocks/")
  );
}

export async function create() {
  // === Read package.json ===============================================================
  let pkg: PackageJson;

  try {
    pkg = await readPackage();
  } catch (error) {
    console.log(c.bold.redBright("  No package.json found"));

    return;
  }

  // === Collect Liveblocks dependencies ==================================================

  const depsToUpgrade = Array.from(
    new Set([
      ...findLiveblocksDependencies(pkg.dependencies),
      ...findLiveblocksDependencies(pkg.devDependencies),
    ])
  );

  if (depsToUpgrade.length === 0) {
    console.log(c.bold.redBright("  No Liveblocks packages found"));
    return;
  }

  const latestDependencies = depsToUpgrade.map((dep) => `${dep}@latest`);

  // === Upgrade collected dependencies to latest ===========================================

  const pkgManager = await detect();

  let installCommand;

  switch (pkgManager) {
    case "yarn":
    case "bun":
    case "pnpm":
      installCommand = "add";
      break;
    case "npm":
    default:
      installCommand = "install";
      break;
  }

  console.log();
  console.log(c.bold.magentaBright(`✨ Upgrading all Liveblocks packages`));
  console.log();

  await execa(pkgManager, [installCommand, ...latestDependencies], {
    stdio: "inherit",
  });
}
