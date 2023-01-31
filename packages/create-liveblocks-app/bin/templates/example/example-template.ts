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
  stageAndCommit,
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
      vercelSpinner.text = c.whiteBright.bold("Cloning new repo...");
      const host = `${vercelData.repo.type}.${
        vercelData.repo.type === "bitbucket" ? "org" : "com"
      }`;
      repoUrls = {
        https: `https://${host}/${vercelData.repo.location}.git`,
        ssh: `git@${host}/${vercelData.repo.location}.git`,
      };
      clonedPrivateRepo = await clonePrivateRepo({ repoUrls, appDir });
    }
    vercelSpinner.succeed(c.green("Vercel deployment complete"));
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
    await initializeGit({ appDir, repoUrls });
  } else if (vercel && clonedPrivateRepo) {
    await stageAndCommit({ appDir });
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

  if (vercel && !clonedPrivateRepo) {
    console.log();
    console.log(
      c.bold.yellowBright(
        "Vercel project can't be cloned: Your git hasn't been set up to allow access to private repos"
      )
    );
    console.log(
      c.bold.yellowBright("Clone your project manually, before running it")
    );
    if (repoUrls) {
      console.log(repoUrls.https);
    }
  }
}
