import type { OptionDefinition } from "command-line-args";
import commandLineArgs from "command-line-args";
import { execSync } from "child_process";

export const commandLineFlags: OptionDefinition[] = [
  {
    name: "typescript",
    type: Boolean,
  },
  {
    name: "tailwind",
    type: Boolean,
  },
];

export async function createNextLiveblocksApp() {
  const { typescript, tailwind } = commandLineArgs(commandLineFlags);
  const starterName = `nextjs-starter-${typescript ? "-typescript" : ""}${tailwind ? "-tailwind" : ""}`;
  execSync(`npx create-liveblocks-app ${starterName}`);
}
