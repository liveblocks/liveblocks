import { NEXTJS_STARTER_KIT_AUTH_PROVIDERS } from "../../constants";
import { getPackageManager } from "../../utils";
import prompts, { PromptObject } from "prompts";
import c from "ansi-colors";

type Questions = {
  name: string;
  auth: typeof NEXTJS_STARTER_KIT_AUTH_PROVIDERS[number];
  vercel: boolean;
  liveblocksSecret: boolean;
  git: boolean;
  install: boolean;
  openBrowser: boolean;
};

export async function nextjsStarterKitPrompts(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();

  // === Configure by asking prompts, questions skipped if flags exist ===
  const questions: PromptObject<keyof Questions>[] = [
    {
      type: flags.name ? null : "text",
      name: "name",
      message: "What would you like to name your project directory?",
      initial: "liveblocks-starter-kit",
    },
    {
      type:
        flags.auth && NEXTJS_STARTER_KIT_AUTH_PROVIDERS.includes(flags.auth)
          ? null
          : "select",
      name: "auth",
      message:
        "Which authentication method would you like to use in your project?",
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
      type: flags.vercel !== undefined || flags["api-key"] ? null : "confirm",
      name: "vercel",
      message: "Would you like to deploy on Vercel?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
    {
      type: (_, values) => {
        // Vercel integration always gets the API keys, so skip question
        if (flags["api-key"] !== undefined || values.vercel || flags.vercel) {
          return null;
        }
        return "confirm";
      },
      name: "liveblocksSecret",
      message:
        "Would you like to get your Liveblocks secret key automatically (recommended)?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
    {
      type: (_, values) => {
        // Vercel needs git, so skip question if Vercel is true
        if (flags.git !== undefined || values.vercel || flags.vercel) {
          return null;
        }
        return "confirm";
      },
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
    {
      type: (_, values) => {
        if (
          values.vercel ||
          values.liveblocksSecret ||
          flags.vercel ||
          flags["api-key"]
        ) {
          return flags.open ? null : "confirm";
        }

        return null;
      },
      name: "openBrowser",
      message: "Open browser window to continue set up? (required)",
      initial: true,
      active: "yes",
      inactive: "no",
    },
  ];

  // === Prompt return values, using flags as defaults ===================
  const {
    name = flags.name,
    auth = flags.auth,
    vercel = flags.vercel,
    liveblocksSecret = flags["api-key"],
    git = flags.git,
    install = flags.install,
    openBrowser = flags.open,
  }: Questions = await prompts(questions, {
    onCancel: () => {
      console.log(c.redBright.bold("Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  if ((vercel || liveblocksSecret) && !openBrowser) {
    console.log(c.redBright.bold("Cancelled"));
    console.log();
    process.exit(0);
  }

  return { name, auth, vercel, liveblocksSecret, git, install };
}
