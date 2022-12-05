import commandLineArgs, { OptionDefinition } from "command-line-args";
import c from "ansi-colors";
import prompts, { PromptObject } from "prompts";
import * as nextjsTemplate from "./templates/nextjsTemplate.js";
import * as exampleTemplate from "./templates/exampleTemplate.js";

type TemplateName = "next"|"example";

const templates: { [K in TemplateName]: any } = {
  "next": nextjsTemplate,
  "example": exampleTemplate,
}

export const commandLineFlags: OptionDefinition[] = [
  {
    name: "template",
    type: String,
    defaultOption: true,
  },
  {
    name: "example",
    type: String,
  },
  {
    name: "next",
    type: Boolean,
  },
  {
    name: "name",
    type: String,
  },
  {
    name: "package-manager",
    type: String,
  },
  {
    name: "install",
    type: Boolean,
  },
  {
    name: "no-install",
    type: Boolean,
  },
  {
    name: "git",
    type: Boolean,
  },
  {
    name: "no-git",
    type: Boolean,
  },
  {
    name: "prettier",
    type: Boolean,
  },
  {
    name: "no-prettier",
    type: Boolean,
  },
];

export async function createLiveblocksApp() {
  console.log(c.magentaBright(`
▀█████▀  ▄   
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
`));

  console.log(c.bold.bgMagenta(" Liveblocks "));
  console.log();

  const flags = commandLineArgs(commandLineFlags);

  // If any --no-[FLAGNAME] is set, set --[FLAGNAME] to false
  // e.g. `--no-install === true` -> `--install === false`
  Object.entries(flags).forEach(([key, val]) => {
    if (val === true) {
      flags[key.slice(3)] = false;
    }
  })

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
      type: (flags.template) ? null : "select",
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
  }: { template: TemplateName } = await prompts(initialQuestions);

  await templates?.[template].create(flags);
}
