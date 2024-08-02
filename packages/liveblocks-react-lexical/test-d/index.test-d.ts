// import * as lbrl from "@liveblocks/react-lexical";
import { expectType } from "tsd";

(async function main() {
  expectType<string>("hi".toString());

  // TODO: Write type-level tests for these exports
  // expectType<unknown>(lbrl.FloatingComposer);
  // expectType<unknown>(lbrl.FloatingThreads);
  // expectType<unknown>(lbrl.liveblocksConfig);
  // expectType<unknown>(lbrl.LiveblocksPlugin);
  // expectType<unknown>(lbrl.Mention);
  // expectType<unknown>(lbrl.OPEN_FLOATING_COMPOSER_COMMAND);
  // expectType<unknown>(lbrl.AnchoredThreads);
})();
