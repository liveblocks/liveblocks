// import * as lbrl from "@liveblocks/react-tiptap";
import { expectType } from "tsd";

(async function main() {
  expectType<string>("hi".toString());

  // TODO: Write type-level tests for these exports
  // expectType<unknown>(lbrl.FloatingComposer);
  // expectType<unknown>(lbrl.FloatingThreads);
  // expectType<unknown>(lbrl.LiveblocksExtension);
  // expectType<unknown>(lbrl.AnchoredThreads);
})();
