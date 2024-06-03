/**
 * Copyright 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Based on https://github.com/reactjs/react-codemod/blob/dd8671c9a470a2c342b221ec903c574cf31e9f57/bin/cli.js
// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

import execa from "execa";
import globby from "globby";
import inquirer from "inquirer";
import isGitClean from "is-git-clean";
import meow from "meow";
import path from "path";
import { bgMagenta, bold, magenta, yellow } from "picocolors";

const TRANSFORMER_INQUIRER_CHOICES = [
  {
    name: 'react-comments-to-react-ui: Transforms "@liveblocks/react-comments" imports to "@liveblocks/react-ui" and <CommentsConfig /> to <LiveblocksUIConfig />',
    value: "react-comments-to-react-ui",
  },
];

export const jscodeshiftExecutable = require.resolve(".bin/jscodeshift");
export const transformerDirectory = path.join(
  __dirname,
  "../",
  "src",
  "transforms"
);

export function checkGitStatus(force: boolean) {
  let clean = false;
  let errorMessage = "Unable to determine if git directory is clean";
  try {
    clean = isGitClean.sync(process.cwd());
    errorMessage = "Git directory is not clean";
  } catch (err) {
    if (
      (err as { stderr?: string })?.stderr?.includes("Not a git repository")
    ) {
      clean = true;
    }
  }

  if (!clean) {
    if (force) {
      console.log(`WARNING: ${errorMessage}. Forcibly continuing.`);
    } else {
      console.log("Thank you for using @liveblocks/codemod!");
      console.log(
        yellow(
          "\nBut before we continue, please stash or commit your git changes."
        )
      );
      console.log(
        "\nYou may use the --force flag to override this safety check."
      );
      process.exit(1);
    }
  }
}

export function runTransform({
  files,
  flags,
  transformer,
}: {
  files: string[];
  flags: { dry: boolean; print: boolean };
  transformer: string;
}) {
  const transformerPath = path.join(transformerDirectory, `${transformer}.js`);

  let args = [];

  const { dry, print } = flags;

  if (dry) {
    args.push("--dry");
  }

  if (print) {
    args.push("--print");
  }

  args.push("--run-in-band");

  args.push("--verbose=2");

  args.push("--ignore-pattern=**/node_modules/**");

  args.push("--extensions=tsx,ts,jsx,js");

  args = args.concat(["--transform", transformerPath]);

  args = args.concat(files);

  const result = execa.sync(jscodeshiftExecutable, args, {
    stdio: "inherit",
    stripFinalNewline: false,
  });

  if (result.failed) {
    throw new Error(`jscodeshift exited with code ${result.exitCode}`);
  }
}

function expandFilePathsIfNeeded(filesBeforeExpansion: string[]) {
  const shouldExpandFiles = filesBeforeExpansion.some((file) =>
    file.includes("*")
  );

  return shouldExpandFiles
    ? globby.sync(filesBeforeExpansion)
    : filesBeforeExpansion;
}

export function run() {
  console.log(
    magenta(`
▀█████▀  ▄   
 ▀██▀  ▄██▄  
  ▀  ▄█████▄ 
`)
  );

  console.log(bgMagenta(bold(" Liveblocks ")));
  console.log();

  const cli = meow({
    help: `
    Usage
      $ npx @liveblocks/codemod@latest <transform> <path> <...options>
        transform    One of the choices from https://github.com/liveblocks/liveblocks/tree/main/packages/liveblocks-codemod
        path         Files or directory to transform. Can be a glob like src/**.ts
    Options
      --force            Bypass Git safety checks and forcibly run codemods
      --dry              Dry run (no changes are made to files)
      --print            Print transformed files to your terminal
    `,
    flags: {
      force: {
        type: "boolean",
        shortFlag: "f",
      },
      dry: {
        type: "boolean",
        shortFlag: "d",
      },
      print: {
        type: "boolean",
        shortFlag: "p",
      },
      help: {
        type: "boolean",
        shortFlag: "h",
      },
      // string: ["_"],
    },
  });

  if (!cli.flags.dry) {
    checkGitStatus(cli.flags.force);
  }

  if (
    cli.input[0] &&
    !TRANSFORMER_INQUIRER_CHOICES.find((x) => x.value === cli.input[0])
  ) {
    console.error("Invalid transform choice, pick one of:");
    console.error(
      TRANSFORMER_INQUIRER_CHOICES.map((x) => "- " + x.value).join("\n")
    );
    process.exit(1);
  }

  void inquirer
    .prompt([
      {
        type: "input",
        name: "files",
        message: "On which files or directory should the codemods be applied?",
        when: !cli.input[1],
        default: ".",
        filter: (files: string) => files.trim(),
      },
      {
        type: "list",
        name: "transformer",
        message: "Which transform would you like to apply?",
        when: !cli.input[0],
        pageSize: TRANSFORMER_INQUIRER_CHOICES.length,
        choices: TRANSFORMER_INQUIRER_CHOICES,
      },
    ])
    .then((answers: { files: string; transformer: string }) => {
      const { files, transformer } = answers;

      const filesBeforeExpansion = cli.input[1] || files;
      const filesExpanded = expandFilePathsIfNeeded([filesBeforeExpansion]);

      const selectedTransformer = cli.input[0] || transformer;

      if (!filesExpanded.length) {
        console.log(`No files found matching ${filesBeforeExpansion}`);
        return null;
      }

      return runTransform({
        files: filesExpanded,
        flags: cli.flags,
        transformer: selectedTransformer,
      });
    });
}