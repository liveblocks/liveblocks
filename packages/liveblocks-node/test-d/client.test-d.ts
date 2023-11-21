import { expectType } from "tsd";
import { Liveblocks } from "../src/client";
import type { PlainLsonObject, JsonObject } from "@liveblocks/core";

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  expectType<PlainLsonObject>(await client.getStorageDocument("document-id"));
  expectType<PlainLsonObject>(
    await client.getStorageDocument("document-id", "plain-lson")
  );
  expectType<JsonObject>(
    await client.getStorageDocument("document-id", "json")
  );
};
