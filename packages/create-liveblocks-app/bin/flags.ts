import { OptionDefinition } from "command-line-args";

export const commandLineFlags: OptionDefinition[] = [
  {
    name: "template",
    type: String,
    defaultOption: true,
  },
  {
    name: "help",
    type: Boolean,
  },
  {
    name: "init",
    type: Boolean,
  },
  {
    name: "upgrade",
    type: String,
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
    name: "vercel",
    type: Boolean,
  },
  {
    name: "no-vercel",
    type: Boolean,
  },
  {
    name: "api-key",
    type: Boolean,
  },
  {
    name: "no-api-key",
    type: Boolean,
  },
  {
    name: "open",
    type: Boolean,
  },
  {
    name: "no-open",
    type: Boolean,
  },
  // For Next.js starter kit
  {
    name: "auth",
    type: String,
  },
  // For init#
  {
    name: "framework",
    type: String,
  },
  {
    name: "suspense",
    type: Boolean,
  },
  {
    name: "no-suspense",
    type: Boolean,
  },
  {
    name: "typescript",
    type: Boolean,
  },
  {
    name: "no-typescript",
    type: Boolean,
  },
  {
    name: "comments",
    type: Boolean,
  },
  {
    name: "no-comments",
    type: Boolean,
  },
];
