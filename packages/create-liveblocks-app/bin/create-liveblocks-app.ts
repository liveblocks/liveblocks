import c from "ansi-colors";
import commandLineArgs from "command-line-args";
import prompts, { PromptObject } from "prompts";
import readline from "readline";
import { commandLineFlags } from "./flags";
import * as nextjsTemplate from "./templates/nextjs-starter-kit";
import * as exampleTemplate from "./templates/example";
import * as helpTemplate from "./templates/help";

type TemplateName = "next" | "example" | "help";

const templates: { [K in TemplateName]: any } = {
  next: nextjsTemplate,
  example: exampleTemplate,
  help: helpTemplate,
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

  const flags = commandLineArgs(commandLineFlags);

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

  const initialQuestions: PromptObject<"template">[] = [
    {
      // Skip question if template already set
      type: flags.template ? null : "select",
      name: "template",
      message: "Which template would you like to use?",
      choices: [
        { title: "Next.js Starter Kit", value: "next" },
        { title: "An example from the Liveblocks repo", value: "example" },
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
