import fs from "fs";
import path from "path";
import crypto from "crypto";
import c from "ansi-colors";
import {
  clonePrivateRepo,
  cloneRepo,
  confirmDirectoryEmpty,
  getPackageManager,
  initializeGit,
  install as installApp,
  loadingSpinner,
  RemoteRepoType,
  server,
  stageAndCommit,
} from "../../utils";
import open from "open";
import {
  GeneralIntegrationCallback,
  GeneralIntegrationData,
  IntegrationOrigin,
  VercelIntegrationCallback,
  VercelIntegrationData,
} from "../../types";
import {
  auth0AuthProvider,
  demoAuthProvider,
  githubAuthProvider,
} from "./auth-provider-code";
import {
  LIVEBLOCKS_GENERAL_INTEGRATION_URL,
  NEXTJS_STARTER_KIT_AUTH_PROVIDERS,
  NEXTJS_STARTER_KIT_GUIDE_URL,
  NEXTJS_STARTER_KIT_REPO_DIRECTORY,
  NEXTJS_STARTER_KIT_VERCEL_DEPLOYMENT_URL,
} from "../../constants";
import { nextjsStarterKitPrompts } from "./nextjs-starter-kit-prompts";

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();
  const { name, auth, vercel, liveblocksSecret, git, install } =
    await nextjsStarterKitPrompts(flags);

  const appDir = path.join(process.cwd(), "./" + name);
  let repoDir = NEXTJS_STARTER_KIT_REPO_DIRECTORY;
  let liveblocksSecretKeyValue = "";
  const nextAuthSecretValue = crypto.randomBytes(32).toString("base64");
  let repoUrls = null;
  let clonedPrivateRepo = false;

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
          env: [{ name: "LIVEBLOCKS_SECRET_KEY", type: "secret" }],
          envReady: [{ name: "NEXTAUTH_SECRET", value: nextAuthSecretValue }],
          callbackUrls: [origin],
          origin:
            IntegrationOrigin.NEXTJS_STARTER_KIT_FROM_CREATE_LIVEBLOCKS_APP_VERCEL_INTEGRATION,
        };
        const encodedData = Buffer.from(JSON.stringify(data)).toString(
          "base64url"
        );

        const deployUrl = NEXTJS_STARTER_KIT_VERCEL_DEPLOYMENT_URL(
          encodedData,
          name
        );
        // const deployUrl = NEXTJS_STARTER_KIT_VERCEL_DEPLOYMENT_URL_DEV(
        //   encodedData,
        //   name
        // );

        await open(deployUrl);
      }
    )) as VercelIntegrationCallback;

    if (vercelData?.env?.LIVEBLOCKS_SECRET_KEY) {
      liveblocksSecretKeyValue = vercelData.env.LIVEBLOCKS_SECRET_KEY;
    }

    if (vercelData.repo) {
      vercelSpinner.text = c.whiteBright.bold("Cloning new repo...");
      const host = `${vercelData.repo.type}.${
        vercelData.repo.type === "bitbucket" ? "org" : "com"
      }`;
      repoUrls = {
        https: `https://${host}/${vercelData.repo.location}.git`,
        ssh: `git@${host}:${vercelData.repo.location}.git`,
      };
      clonedPrivateRepo = await clonePrivateRepo({ appDir, repoUrls });
    }
    vercelSpinner.succeed(c.green("Vercel deployment complete!"));
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
        env: [{ name: "LIVEBLOCKS_SECRET_KEY", type: "secret" }],
        callbackUrls: [origin],
        origin:
          IntegrationOrigin.NEXTJS_STARTER_KIT_FROM_CREATE_LIVEBLOCKS_APP_GENERAL_INTEGRATION,
      };
      const encodedData = Buffer.from(JSON.stringify(data)).toString(
        "base64url"
      );

      const liveblocksUrl = LIVEBLOCKS_GENERAL_INTEGRATION_URL(encodedData);
      // const liveblocksUrl = LIVEBLOCKS_GENERAL_INTEGRATION_URL_DEV(encodedData);
      open(liveblocksUrl);
    })) as GeneralIntegrationCallback;

    if (liveblocksData?.env?.LIVEBLOCKS_SECRET_KEY) {
      liveblocksSecretKeyValue = liveblocksData.env.LIVEBLOCKS_SECRET_KEY;
    }

    liveblocksSpinner.succeed(c.green("Liveblocks secret key added!"));
  }

  const envVariables = [
    {
      key: "LIVEBLOCKS_SECRET_KEY",
      value: liveblocksSecretKeyValue,
    },
    ...getAuthEnvVariables(auth),
    {
      // https://next-auth.js.org/configuration/options#secret
      key: "NEXTAUTH_SECRET",
      value: nextAuthSecretValue,
    },
  ];

  // === Clone starter kit repo ==========================================
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

  // === Set up starter kit authentication ===============================
  const nextauthTsLocation = path.join(
    appDir,
    "pages",
    "api",
    "auth",
    "[...nextauth].ts"
  );
  const nextauthTs = fs.readFileSync(nextauthTsLocation, "utf-8");
  filesToWrite.push({
    location: nextauthTsLocation,
    content: addAuthProviderSetup(auth, nextauthTs),
  });

  // === Add .env.local ==================================================
  filesToWrite.push({
    location: path.join(appDir, ".env.local"),
    content: envVariables.map(({ key, value }) => `${key}=${value}`).join("\n"),
  });

  // === Add package.json ================================================
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  filesToWrite.push({
    location: packageJsonLocation,
    content: JSON.stringify(packageJson, null, 2),
  });

  // === Write files, install, set up git ================================
  filesToWrite.forEach(({ location, content }) => {
    fs.writeFileSync(location, content);
  });

  if (install) {
    await installApp({
      appDir,
      packageManager,
    });
  }

  let repoRemoteStatus: RemoteRepoType = "none";

  if (git || (vercel && !clonedPrivateRepo)) {
    repoRemoteStatus = await initializeGit({ appDir, repoUrls });
  } else if (vercel && clonedPrivateRepo) {
    await stageAndCommit({ appDir });
  }

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
        ? "Link your Vercel project and start developing by typing:"
        : "Start using the Next.js Starter Kit by typing:"
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
  logInstruction(c.cyanBright(`${cmd} dev`));

  console.log();
  console.log(c.bold.magentaBright("✨ Ready to collaborate!"));

  console.log();
  if (auth && auth !== "demo") {
    console.log(
      c.bold(
        "Read the guide to finish setting up your authentication, and the rest of your app:"
      )
    );
  } else {
    console.log(c.bold("Read the guide to finish setting up your app:"));
  }
  console.log(NEXTJS_STARTER_KIT_GUIDE_URL);
  console.log();
}

// Get environment variables required for your auth solution
function getAuthEnvVariables(
  auth: typeof NEXTJS_STARTER_KIT_AUTH_PROVIDERS[number]
) {
  const envVariables = {
    demo: [],
    github: [
      { key: "GITHUB_CLIENT_ID", value: "" },
      { key: "GITHUB_CLIENT_SECRET", value: "" },
    ],
    auth0: [
      { key: "AUTH0_CLIENT_ID", value: "" },
      { key: "AUTH0_CLIENT_SECRET", value: "" },
      { key: "AUTH0_ISSUER_BASE_URL", value: "" },
    ],
  };

  return envVariables?.[auth] || [];
}

// Add the selected auth provider code to a `[...nextauth].ts` file
function addAuthProviderSetup(
  auth: typeof NEXTJS_STARTER_KIT_AUTH_PROVIDERS[number],
  nextauthTs: string
): string {
  let newFileContent = nextauthTs;

  // RegExp for finding the content within the array: `providers: []`
  // Works so long as `providers` contains no nested arrays more than 3 layers deep
  const findProviders =
    /providers:[\s]*\[(?:[^\]\[]|\[(?:[^\]\[]|\[(?:[^\]\[]|\[[^\]\[]*])*])*])*]/;
  newFileContent = newFileContent.replace(
    findProviders,
    "providers: [" + getAuthProvider(auth) + "  ]"
  );

  // RegExp for finding CredentialsProvider import line
  // Works if import is on one single line
  const findImport = /^import[\s]+CredentialsProvider[\w\W]+?$/m;
  newFileContent = newFileContent.replace(
    findImport,
    getAuthProviderImport(auth)
  );

  return newFileContent;
}

// Get the selected auth provider initialization code
function getAuthProvider(
  auth: typeof NEXTJS_STARTER_KIT_AUTH_PROVIDERS[number]
): string {
  const providers = {
    demo: demoAuthProvider,
    github: githubAuthProvider,
    auth0: auth0AuthProvider,
  };

  return providers?.[auth] || "";
}

// Get the select auth provider import code
function getAuthProviderImport(
  auth: typeof NEXTJS_STARTER_KIT_AUTH_PROVIDERS[number]
): string {
  const imports = {
    demo: 'import CredentialsProvider from "next-auth/providers/credentials";',
    github: 'import GithubProvider from "next-auth/providers/github";',
    auth0: 'import Auth0Provider from "next-auth/providers/auth0";',
  };

  return imports?.[auth] || "";
}
