import c from "ansi-colors";
import path from "path";
import {
  clonePrivateRepo,
  cloneRepo,
  confirmDirectoryEmpty,
  getBuildCommand,
  getDevCommand,
  getPackageManager,
  initializeGit,
  install as installApp,
  loadingSpinner,
  RemoteRepoType,
  server,
} from "../../utils";
import open from "open";
import fs from "fs";
import {
  EXAMPLE_VERCEL_DEPLOYMENT_URL,
  EXAMPLES_REPO_LOCATION,
  LIVEBLOCKS_GENERAL_INTEGRATION_URL,
} from "../../constants";
import { examplePrompts } from "./example-prompts";
import {
  GeneralIntegrationCallback,
  GeneralIntegrationData,
  IntegrationOrigin,
  VercelIntegrationCallback,
  VercelIntegrationData,
} from "../../types";

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();
  const { example, name, vercel, liveblocksSecret, git, install } =
    await examplePrompts(flags);

  const appDir = path.join(process.cwd(), "./" + name);
  let repoDir = EXAMPLES_REPO_LOCATION + example;
  let repoUrls = null;
  let clonedPrivateRepo = false;
  const envVariables: { key: string; value: string }[] = [];

  // Empty/create appDir repo
  console.log();
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
          env: [],
          envReady: [],
          exampleNames: [example],
          callbackUrls: [origin],
          origin:
            IntegrationOrigin.EXAMPLE_FROM_CREATE_LIVEBLOCKS_APP_VERCEL_INTEGRATION,
        };
        const encodedData = Buffer.from(JSON.stringify(data)).toString(
          "base64url"
        );

        const deployUrl = EXAMPLE_VERCEL_DEPLOYMENT_URL(
          encodedData,
          name,
          example
        );
        // const deployUrl = EXAMPLE_VERCEL_DEPLOYMENT_URL_DEV(
        //   encodedData,
        //   name,
        //   example
        // );

        await open(deployUrl);
      }
    )) as VercelIntegrationCallback;

    Object.entries(vercelData.env).forEach(([key, value]) => {
      envVariables.push({ key, value });
    });

    if (vercelData.repo) {
      vercelSpinner.text = "Cloning new repo...";
      const host = `${vercelData.repo.type}.${
        vercelData.repo.type === "bitbucket" ? "org" : "com"
      }`;
      repoUrls = {
        https: `https://${host}/${vercelData.repo.location}.git`,
        ssh: `git@${host}:${vercelData.repo.location}.git`,
      };

      clonedPrivateRepo = await clonePrivateRepo({ appDir, repoUrls });

      if (clonedPrivateRepo) {
        vercelSpinner.succeed(c.green("Vercel deployment complete!"));
      } else {
        vercelSpinner.warn(
          c.yellowBright.bold(
            `Problem cloning private repo, using public repo instead`
          )
        );
      }
    }
  }

  // === Get Liveblocks secret key from general integration ==============
  if (liveblocksSecret) {
    const liveblocksSpinner = loadingSpinner().start(
      c.whiteBright.bold(
        "Opening Liveblocks, import your API key then check back..."
      )
    );

    const liveblocksData = (await server((origin) => {
      const data: GeneralIntegrationData = {
        env: [],
        exampleNames: [example],
        callbackUrls: [origin],
        origin:
          IntegrationOrigin.EXAMPLE_FROM_CREATE_LIVEBLOCKS_APP_GENERAL_INTEGRATION,
      };
      const encodedData = Buffer.from(JSON.stringify(data)).toString(
        "base64url"
      );

      const liveblocksUrl = LIVEBLOCKS_GENERAL_INTEGRATION_URL(encodedData);
      // const liveblocksUrl = LIVEBLOCKS_GENERAL_INTEGRATION_URL_DEV(encodedData);
      open(liveblocksUrl);
    })) as GeneralIntegrationCallback;

    Object.entries(liveblocksData.env).forEach(([key, value]) => {
      envVariables.push({ key, value });
    });

    liveblocksSpinner.succeed(c.green("Liveblocks API key added"));
  }

  // === Clone example repo ==============================================
  if (!clonedPrivateRepo) {
    await confirmDirectoryEmpty(appDir);
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

  let repoRemoteStatus: RemoteRepoType = "none";

  if (git || (vercel && !clonedPrivateRepo)) {
    repoRemoteStatus = await initializeGit({ appDir, repoUrls });
  }

  // === Check which command will start dev server from package.json =====
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  const devCommand = getDevCommand(packageJson?.scripts || {});
  const buildCommand = getBuildCommand(packageJson?.scripts || {});

  // === Final console messages ==========================================
  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  const mustLinkRepo = vercel && !clonedPrivateRepo;
  let instructionCount = 1;

  function logInstruction(message: string) {
    console.log(` ${instructionCount++}: ${message}`);
  }

  console.log();
  console.log(
    c.bold(
      mustLinkRepo
        ? `Link your Vercel project and start ${
            devCommand ? "developing " : ""
          } by typing:`
        : `Start ${devCommand ? "developing " : ""}by typing:`
    )
  );
  logInstruction(c.cyanBright(`cd ${name}`));

  if (mustLinkRepo && repoUrls) {
    if (repoRemoteStatus === "none") {
      console.log();
      logInstruction(c.cyanBright(`git remote add origin ${repoUrls.https}`));
      console.log("    (or)");
      console.log(c.cyanBright(`    git remote add origin ${repoUrls.ssh}`));
      console.log();
    }
    logInstruction(c.cyanBright("git push origin main --force"));
  }

  if (!install) {
    logInstruction(c.cyanBright(`${packageManager} install`));
  }

  if (devCommand || buildCommand) {
    logInstruction(c.cyanBright(`${cmd} ${devCommand || buildCommand}`));
  }

  console.log();
  console.log(c.bold.magentaBright("✨ Ready to collaborate!"));
  console.log();
}
