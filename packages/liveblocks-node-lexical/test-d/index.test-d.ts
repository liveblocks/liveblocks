import * as lbnl from "@liveblocks/node-lexical";
import type { LexicalEditor } from "lexical";
import type { LiveblocksDocument } from "@liveblocks/node-lexical";
import { expectType } from "tsd";
import { Liveblocks } from "@liveblocks/node";

const client = new Liveblocks({ secret: "sk_xxx" });

(async function main() {
  const doc = await lbnl.createLiveblocksDocument(client, "my-room", [
    // TODO: Add some real nodes here
  ]);

  expectType<LiveblocksDocument>(doc);
  expectType<LexicalEditor>(await doc.getLexicalEditor());
  expectType<string>(await doc.getTextContent());

  // TODO: Test return value of .toJSON()
  // expectType<>(doc.toJSON());

  // TODO: Test update types
  // doc.update(() => {
  // })

  expectType<void>(await doc.destroy());
})();
