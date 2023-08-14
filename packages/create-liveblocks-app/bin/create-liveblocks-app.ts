import c from "ansi-colors";
import commandLineArgs, { CommandLineOptions } from "command-line-args";
import prompts, { PromptObject } from "prompts";
import readline from "readline";
import { commandLineFlags } from "./flags";
import * as nextjsTemplate from "./templates/nextjs-starter-kit";
import * as exampleTemplate from "./templates/example";
import * as helpTemplate from "./templates/help";
import * as initTemplate from "./templates/init";

type TemplateName = "next" | "example" | "help" | "init";

const templates: { [K in TemplateName]: any } = {
  next: nextjsTemplate,
  example: exampleTemplate,
  help: helpTemplate,
  init: initTemplate,
};

export async function createLiveblocksApp() {
  listenForQuit();

  console.log(
    c.magentaBright(`
▀█████▀  ▄   
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
`)
  );

  console.log(c.bold.bgMagenta(" Liveblocks "));
  console.log();

  let flags: CommandLineOptions;

  try {
    flags = commandLineArgs(commandLineFlags);
  } catch (err) {
    if (err.name === "UNKNOWN_OPTION") {
      console.log(
        c.redBright.bold(
          `Error: \`${c.whiteBright(err.optionName)}\` is not a valid flag`
        )
      );
      console.log();
      console.log(c.bold("Learn more:"));
      console.log(
        "https://github.com/liveblocks/liveblocks/blob/main/packages/create-liveblocks-app/README.MD"
      );
    } else {
      console.log(c.redBright.bold("Error"));
      console.log(err);
    }
    process.exit(0);
  }

  flags.comments = true;

  // If any --no-[FLAGNAME] is set, set --[FLAGNAME] to false
  // e.g. `--no-install === true` -> `--install === false`
  Object.entries(flags).forEach(([key, val]) => {
    if (val === true) {
      flags[key.slice(3)] = false;
    }
  });

  // If --help specified, show the help template
  if (flags.help) {
    flags.template = "help";
  }

  // If --example specified, this is an example
  if (flags.example) {
    flags.template = "example";
  }

  // If --next specified, this is the next starter kit
  if (flags.next) {
    flags.template = "next";
  }

  if (flags.init) {
    flags.template = "init";
  }

  const initialQuestions: PromptObject<"template">[] = [
    {
      // Skip question if template already set
      type: flags.template ? null : "select",
      name: "template",
      message: "What would you like to do?",
      choices: [
        { title: "Get the Next.js Starter Kit", value: "next" },
        { title: "Get an example from the Liveblocks repo", value: "example" },
        {
          title: "Create a liveblocks.config file",
          value: "init",
        },
      ],
    },
  ];

  const {
    // If question skipped, use answer from flags
    template = flags.template,
  }: { template: TemplateName } = await prompts(initialQuestions, {
    onCancel: () => {
      console.log(c.redBright.bold("  Cancelled"));
      console.log();
      process.exit(0);
    },
  });

  if (!templates?.[template]) {
    console.log();
    console.log(
      c.redBright.bold(
        "Template not valid, try running the installer without flags"
      )
    );
    console.log();
    process.exit(0);
  }

  await templates[template].create(flags);
  process.exit(0);
}

function listenForQuit() {
  function closeTerminal() {
    console.log();
    console.log(c.redBright.bold("Cancelled"));
    console.log();
    process.exit(0);
  }

  if (process.platform === "win32") {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on("SIGINT", () => process.emit("SIGINT"));
    rl.on("SIGQUIT", () => process.emit("SIGQUIT"));
    rl.on("SIGTERM", () => process.emit("SIGTERM"));
  }

  process.on("SIGINT", closeTerminal);
  process.on("SIGQUIT", closeTerminal);
  process.on("SIGTERM", closeTerminal);
}
