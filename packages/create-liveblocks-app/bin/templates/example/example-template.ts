import c from "ansi-colors";
import path from "path";
import {
  cloneRepo,
  initializeGit,
  install as installApp,
  confirmDirectoryEmpty,
  getBuildCommand,
  getDevCommand,
  getPackageManager,
  loadingSpinner,
  server,
  clonePrivateRepo,
} from "../../utils";
import open from "open";
import fs from "fs";
import {
  EXAMPLE_VERCEL_DEPLOYMENT_URL_DEV,
  EXAMPLES_REPO_LOCATION,
} from "../constants";
import { examplePrompts } from "./example-prompts";
import { VercelIntegrationCallback, VercelIntegrationData } from "../types";

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();
  const { example, name, vercel, liveblocksSecret, git, install } =
    await examplePrompts(flags);

  const appDir = path.join(process.cwd(), "./" + name);
  let repoDir = EXAMPLES_REPO_LOCATION + example;
  let clonedPrivateRepo = false;
  const envVariables: { key: string; value: string }[] = [];

  // Empty/create appDir repo
  await confirmDirectoryEmpty(appDir);

  // === Deploy on Vercel and use Vercel integration to get secret key ===
  if (vercel) {
    const vercelSpinner = loadingSpinner("", c.whiteBright("▲")).start(
      c.whiteBright.bold(
        "Opening Vercel, continue deploying then check back..."
      )
    );
    const vercelData: VercelIntegrationCallback = (await server(
      async (origin) => {
        const data: VercelIntegrationData = {
          env: [{ name: "LIVEBLOCKS_SECRET_KEY", type: "secret" }],
          envReady: [],
          exampleNames: [example],
          callbackUrls: [origin],
        };
        const encodedData = Buffer.from(JSON.stringify(data)).toString(
          "base64url"
        );

        // const deployUrl = EXAMPLE_VERCEL_DEPLOYMENT(encodedData, name)
        const deployUrl = EXAMPLE_VERCEL_DEPLOYMENT_URL_DEV(
          encodedData,
          name,
          example
        );

        await open(deployUrl);
      }
    )) as VercelIntegrationCallback;

    Object.entries(vercelData.env).forEach(([key, value]) => {
      envVariables.push({ key, value });
    });

    if (vercelData.repo) {
      vercelSpinner.text = c.whiteBright.bold("Cloning new repo...");
      const privateRepoDir = `https://${vercelData.repo.type}.com/${vercelData.repo.location}`;
      clonedPrivateRepo = await clonePrivateRepo({ privateRepoDir, appDir });
    }
    vercelSpinner.succeed(c.green("Vercel deployment complete"));
  }

  // === Clone example repo ==============================================
  if (!clonedPrivateRepo) {
    const result = await cloneRepo({ repoDir, appDir });

    if (!result) {
      console.log();
      console.log(c.redBright.bold("Target repo is empty"));
      console.log();
      return;
    }
  }

  const filesToWrite: { location: string; content: string }[] = [];

  // === Add .env.local ==================================================
  filesToWrite.push({
    location: path.join(appDir, ".env.local"),
    content: envVariables.map(({ key, value }) => `${key}=${value}`).join("\n"),
  });

  // === Write files, install, set up git ================================
  filesToWrite.forEach(({ location, content }) => {
    fs.writeFileSync(location, content);
  });

  if (install) {
    await installApp({
      appDir: appDir,
      packageManager: packageManager,
    });
  }

  if (git) {
    await initializeGit({ appDir });
  }

  // === Check which command will start dev server from package.json =====
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  const devCommand = getDevCommand(packageJson?.scripts || {});
  const buildCommand = getBuildCommand(packageJson?.scripts || {});

  // === Final console messages ==========================================
  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  let instructionCount = 1;

  console.log(`
${c.bold(`Start ${devCommand ? "developing " : ""}by typing:`)}
 ${instructionCount++}: ${c.cyanBright(`cd ${name}`)}${
    !install
      ? c.cyanBright(`
 ${instructionCount++}: ${packageManager} install`)
      : ""
  }`);

  if (devCommand || buildCommand) {
    console.log(
      ` ${instructionCount++}: ${c.cyanBright(
        `${cmd} ${devCommand || buildCommand}`
      )}`
    );
  }

  console.log();
  console.log(c.bold.magentaBright("✨ Ready to collaborate!"));
  console.log();
}
