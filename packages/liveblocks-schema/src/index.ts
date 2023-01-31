import { Command } from "commander";
import { ErrorReporter } from "./lib/error-reporting";
import { prettify } from "./prettify";
import { check } from "./checker";
import { parse } from "./parser";

const version = "0.0.1";

async function main() {
  const cmd = new Command("parse-schema")
    .version(version)
    .description("Parse a Liveblocks schema and display the AST")
    .argument("<file>", "File to parse")
    .parse(process.argv);

  const filename = cmd.args[0];
  if (!filename) {
    cmd.help();
    process.exit(0);
  }

  // Run compiler
  const reporter = ErrorReporter.fromPath(filename);
  try {
    const ast = check(parse(reporter), reporter);
    console.log(prettify(ast));
  } catch (err: unknown) {
    console.log((err as Error).message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
