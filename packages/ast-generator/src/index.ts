#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { generateAST } from "./generator";

async function main() {
  const cmd = new Command("generate-ast")
    .description(
      "Generate a TypeScript module for the AST defined in the grammar"
    )
    .argument("<infile>", "Source grammar (*.grammar)")
    .argument("<outfile>", "Output file (*.ts)")
    .parse(process.argv);

  const infile = cmd.args[0];
  const outfile = cmd.args[1];
  if (!infile || !outfile) {
    cmd.help();
    process.exit(0);
  }

  // Run compiler
  await generateAST(infile, outfile);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(chalk.red((e as Error).message));
    process.exit(1);
  });
