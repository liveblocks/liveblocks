import type { CommandLineOptions, OptionDefinition } from "command-line-args";

const base = "liveblocks/liveblocks/examples/next-js-starter"

export const commandLineFlags: OptionDefinition[] = [
  {
    name: "typescript",
    type: Boolean,
  },
  {
    name: "tailwind",
    type: Boolean,
  },
]

export function getTemplatePath({ typescript = false, tailwind = false }: CommandLineOptions) {
  return "liveblocks/liveblocks/examples/nextjs-live-avatars";
  // @ts-ignore
  return `${base}${typescript ? "-typescript" : ""}${tailwind ? "-tailwind" : ""}`;
}
