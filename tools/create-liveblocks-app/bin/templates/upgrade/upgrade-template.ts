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

type Flags = {
  upgrade: string;
};

export async function create(flags: Flags) {
  // === Read package.json ===============================================================
  let pkg: PackageJson;

  try {
    pkg = await readPackage();
  } catch (error) {
    console.log(c.bold.redBright("  No package.json found"));

    return;
  }

  // === Collect Liveblocks dependencies ==================================================

  const liveblocksDeps = Array.from(
    new Set([
      ...findLiveblocksDependencies(pkg.dependencies),
      ...findLiveblocksDependencies(pkg.devDependencies),
    ])
  );

  if (liveblocksDeps.length === 0) {
    console.log(c.bold.redBright("  No Liveblocks packages found"));
    return;
  }

  // Decide which dependencies to upgrade or uninstall
  const depsToUpgrade = liveblocksDeps.map((d) => {
    if (d === "@liveblocks/react-comments") {
      return "@liveblocks/react-ui";
    } else {
      return d;
    }
  });

  const depsToUninstall = liveblocksDeps.filter(
    (d) => d === "@liveblocks/react-comments"
  );

  // === Upgrade collected dependencies ====================================================

  const pkgManager = await detect();

  let installCmd;
  let uninstallCmd;

  switch (pkgManager) {
    case "yarn":
    case "bun":
    case "pnpm":
      installCmd = "add";
      uninstallCmd = "remove";
      break;
    case "npm":
    default:
      installCmd = "install";
      uninstallCmd = "uninstall";
      break;
  }

  console.log();
  console.log(c.bold.magentaBright(`✨ Upgrading all Liveblocks packages`));
  console.log();

  if (depsToUninstall.length > 0) {
    await execa(pkgManager, [uninstallCmd, ...depsToUninstall], {
      stdio: "inherit",
    });
  }

  if (depsToUpgrade.length > 0) {
    await execa(
      pkgManager,
      [installCmd, ...depsToUpgrade.map((dep) => `${dep}@${flags.upgrade}`)],
      { stdio: "inherit" }
    );
  }

  // Warn user if dependency on @liveblocks/core is detected
  if (liveblocksDeps.includes("@liveblocks/core")) {
    console.log();
    console.log(
      c.bold.yellowBright(`⚠️ We detected a dependency on @liveblocks/core.`)
    );
    console.log(
      c.bold.yellowBright(
        `Please note that @liveblocks/core contains private APIs only.`
      )
    );
    console.log(
      c.bold.yellowBright(
        `It is recommended to only rely on @liveblocks/client.`
      )
    );
    console.log();
  }
}
