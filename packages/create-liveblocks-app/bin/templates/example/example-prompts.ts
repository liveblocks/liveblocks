import prompts, { PromptObject } from "prompts";
import { getPackageManager } from "../../utils";
import { EXAMPLES_URL } from "../../constants";
import c from "ansi-colors";

type Questions = {
  example: string;
  name: string;
  vercel: boolean;
  liveblocksSecret: boolean;
  git: boolean;
  install: boolean;
  openBrowser: boolean;
};

export async function examplePrompts(flags: Record<string, any>) {
  const packageManager = flags.packageManager || getPackageManager();

  // === Configure by asking prompts, questions skipped if flags exist ===
  const questions: PromptObject<keyof Questions>[] = [
    {
      type: flags.example ? null : "text",
      name: "example",
      message: `Name of the example you're cloning (e.g. nextjs-live-avatars)?
  ${c.magentaBright(EXAMPLES_URL)}`,
    },
    {
      type: flags.name ? null : "text",
      name: "name",
      message: "What would you like to name your project directory?",
    },
    {
      type: flags.vercel !== undefined || flags["get-key"] ? null : "confirm",
      name: "vercel",
      message: "Would you like to deploy on Vercel?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
    {
      type: (_, values) => {
        // Vercel integration always gets the API keys, so skip question
        if (flags["get-key"] !== undefined || values.vercel || flags.vercel) {
          return null;
        }
        return "confirm";
      },
      name: "liveblocksSecret",
      message:
        "Would you like to get your Liveblocks API key automatically (recommended)?",
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
          flags["get-key"]
        ) {
          return flags.open ? null : "confirm";
        }

        return null;
      },
      name: "openBrowser",
      message: "Open browser window to continue set up?",
      initial: true,
      active: "yes",
      inactive: "no",
    },
  ];

  // === Prompt return values, using flags as defaults ===================
  const {
    example = flags.example,
    name = flags.name,
    vercel = flags.vercel,
    liveblocksSecret = flags["get-key"],
    git = flags.git,
    install = flags.install,
    openBrowser = flags.open,
  }: Questions = await prompts(questions, {
    onCancel: () => {
      console.log(c.redBright.bold("  Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  if ((vercel || liveblocksSecret) && !openBrowser) {
    console.log(c.redBright.bold("Cancelled"));
    console.log();
    process.exit(0);
  }

  return { example, name, vercel, liveblocksSecret, git, install };
}
