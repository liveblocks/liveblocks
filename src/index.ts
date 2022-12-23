// import colors from "colors";
import commander from "commander";
// import check, { checkWithContext, buildContext } from "./checker";
import { /* ErrorReporter, */ Source } from "./lib/error-reporting";
import { format } from "./formatter";
import { parse } from "./parser";

const version = "0.0.1";

console.log("henkkkkkkkkkk");

async function main() {
  const program = commander.name("schematizer");

  // When you type "schematizer parse"
  program
    .version(version)
    .command("parse <file>")
    .description("Parse a Liveblocks schema and display the AST")
    .action((filename) => {
      console.error("yo", filename);
      if (!filename) {
        program.help();
        process.exit(0);
      }

      // Run compiler
      try {
        const ast = parse(Source.fromPath(filename));
        console.log(format(ast));
      } catch (parseErr: unknown) {
        console.log((parseErr as Error).message);
        process.exit(1);
      }
    });

  // When you type "nox check"
  //program
  //  .version(version)
  //  .command("check <file>")
  //  //.description('Parse a Nox program and type check it')
  //  // .option('-a, --action <action>')
  //  .action((filename) => {
  //    if (!filename) {
  //      program.help();
  //      process.exit(0);
  //    }

  //    // Run compiler
  //    try {
  //      const reporter = ErrorReporter.fromPath(filename);
  //      const ast = parse(reporter);

  //      let result;
  //      const HACK_ADD_FAKE_CONTEXT_VALUES = true;
  //      if (HACK_ADD_FAKE_CONTEXT_VALUES) {
  //        //
  //        // -------------------------------------------------------------
  //        // HACK: Add in some fake function types to the context
  //        // here now, until we're ready to define these via a normal
  //        // function declaration ourselves.  The typechecker isn't
  //        // there yet.
  //        //
  //        const context = buildContext(reporter);
  //        context.types = {
  //          // TODO: REMOVE THESE HARDCODED TYPES FROM CONTEXT
  //          // random_int: parseType("() => Int"),
  //          // two_random_ints: parseType("() => (Int, Int)"),
  //        };
  //        result = checkWithContext(ast, context);
  //        //
  //        // END OF HACK
  //        // -------------------------------------------------------------
  //        //
  //      } else {
  //        result = check(ast, reporter);
  //      }

  //      if (result) {
  //        console.log(colors.green("All OK!"));
  //      } else {
  //        // TODO: Figure out what the best failure technique is for
  //        // the type checker:
  //        // - Throw an error and catch it here, like the parse error?
  //        // - Let _it_ throw/print the error, and then also exit
  //        //   here (= current approach)
  //        // - Let it return a Result<GatheredTypeInfo, TypeError[]>,
  //        //   and print those type errors upon failure, and print
  //        //   out gathered debug info when success?
  //        process.exit(2);
  //      }
  //    } catch (parseOrTypeErr: unknown) {
  //      console.log((parseOrTypeErr as Error).message);
  //      process.exit(1);
  //    }
  //  });

  program.on("command:*", function () {
    console.error(
      "Unknown command: %s\nSee --help for a list of available commands.",
      program.args.join(" ")
    );
    process.exit(1);
  });

  // Main compiler
  program
    .command("run")
    //.description('Run a Nox program')
    .action((_file) => {
      console.log(
        "Nox is not mature enough to actually have a runner yet! Please bare with us!"
      );
    });

  // Run it!
  program.parse(process.argv);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
