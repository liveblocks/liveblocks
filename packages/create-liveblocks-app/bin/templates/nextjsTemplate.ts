import fs from "fs";
import path from "path";
import crypto from "crypto";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import { cloneRepo } from "../utils/cloneRepo";
import { initializeGit } from "../utils/initializeGit";
import { install as installApp } from "../utils/install";
import { getPackageManager } from "../utils/getPackageManager";
import { confirmDirectoryEmpty } from "../utils/confirmDirectoryEmpty";

const NEXTJS_STARTER_KIT_GUIDE_URL =
  "https://liveblocks.io/docs/guides/nextjs-starter-kit";
const NEXTJS_STARTER_KIT_REPO_DIRECTORY =
  "liveblocks/liveblocks/starter-kits/nextjs-starter-kit";

const AUTH_PROVIDERS = ["demo", "github", "auth0"] as const;

type Questions = {
  name: string;
  auth: typeof AUTH_PROVIDERS[number];
  prettier: boolean;
  git: boolean;
  install: boolean;
};

export async function create(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();

  const questions: PromptObject<keyof Questions>[] = [
    {
      type: flags.name ? null : "text",
      name: "name",
      message: "What would you like to name your project directory?",
    },
    {
      type: flags.auth && AUTH_PROVIDERS.includes(flags.auth) ? null : "select",
      name: "auth",
      message: "Which authentication method would you like to use?",
      choices: [
        {
          title: "Demo",
          description: "Add your own authentication later",
          value: "demo",
        },
        {
          title: "GitHub",
          description: "Sign in with GitHub (instructions in guide)",
          value: "github",
        },
        {
          title: "Auth0",
          description: "Sign in with Auth0 (instructions in guide)",
          value: "auth0",
        },
      ],
      initial: false,
      active: "yes",
      inactive: "no",
    },
    {
      type: flags.git !== undefined ? null : "confirm",
      name: "git",
      message: "Would you like to initialize a new git repository?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
    {
      type: flags.install !== undefined ? null : "confirm",
      name: "install",
      message: `Would you like to install with ${packageManager}?`,
      initial: true,
      active: "yes",
      inactive: "no",
    },
  ];

  const {
    name = flags.name,
    auth = flags.auth,
    git = flags.git,
    install = flags.install,
  }: Questions = await prompts(questions, {
    onCancel: () => {
      console.log(c.redBright.bold("  Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  const repoDir = NEXTJS_STARTER_KIT_REPO_DIRECTORY;
  const appDir = path.join(process.cwd(), "./" + name);

  await confirmDirectoryEmpty(appDir);
  const result = await cloneRepo({ repoDir, appDir });

  if (!result) {
    console.log();
    console.log(c.redBright.bold("Target repo is empty"));
    console.log();
    return;
  }

  const filesToWrite: { location: string; content: string }[] = [];

  // Set up authentication
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
    content: addAuthproviderSetup(auth, nextauthTs),
  });

  // Add .env.local
  const envVariables = [
    {
      key: "LIVEBLOCKS_SECRET_KEY",
      value: "",
    },
    ...getAuthEnvVariables(auth),
    {
      // https://next-auth.js.org/configuration/options#secret
      key: "NEXTAUTH_SECRET",
      value: crypto.randomBytes(32).toString("base64"),
    },
  ];
  filesToWrite.push({
    location: path.join(appDir, ".env.local"),
    content: envVariables.map(({ key, value }) => `${key}=${value}`).join("\n"),
  });

  // Add package.json
  const packageJsonLocation = path.join(appDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonLocation, "utf8"));
  filesToWrite.push({
    location: packageJsonLocation,
    content: JSON.stringify(packageJson, null, 2),
  });

  // Write files
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

  const cmd = `${packageManager}${packageManager === "npm" ? " run" : ""}`;
  let instructionCount = 1;

  console.log();
  console.log(c.bold("Start using the Next.js Starter Kit by typing:"));

  console.log(` ${instructionCount++}: ${c.cyanBright(`cd ${name}`)}${
    !install
      ? `
 ${instructionCount++}: ${c.cyanBright(`${packageManager} install`)}`
      : ""
  }
 ${instructionCount++}: ${c.cyanBright(`${cmd} dev`)}`);

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
function getAuthEnvVariables(auth: Questions["auth"]) {
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
function addAuthproviderSetup(
  auth: Questions["auth"],
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

const demoAuthProvider = `
    // CredentialsProvider is used for the demo auth system
    // Replace this with a real provider, e.g. GitHub, Auth0
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "email",
          type: "text",
        },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const a = [1, 2];

        const user: User | null = await getUser(credentials.email);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.id,
          image: user.avatar,
        };
      },
    }),
`;

const githubAuthProvider = `
    // Use GitHub authentication
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    
`;

const auth0AuthProvider = `
    // Use Auth0 authentication
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID as string,
      clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
    }),
`;

// Get the selected auth provider initialization code
function getAuthProvider(auth: Questions["auth"]): string {
  const providers = {
    demo: demoAuthProvider,
    github: githubAuthProvider,
    auth0: auth0AuthProvider,
  };

  return providers?.[auth] || "";
}

// Get the select auth provider import code
function getAuthProviderImport(auth: Questions["auth"]): string {
  const imports = {
    demo: 'import CredentialsProvider from "next-auth/providers/credentials";',
    github: 'import GithubProvider from "next-auth/providers/github";',
    auth0: 'import Auth0Provider from "next-auth/providers/auth0";',
  };

  return imports?.[auth] || "";
}
