import type { LiveList } from "@liveblocks/client";
import { raise, wait } from "@liveblocks/core";

import { Liveblocks } from ".";

declare global {
  interface Liveblocks {
    Storage: {
      items: LiveList<number | string>;
    };
  }
}

const liveblocks = new Liveblocks({
  secret:
    process.env.LIVEBLOCKS_SECRET_KEY ?? raise("Missing LIVEBLOCKS_SECRET_KEY"),
  baseUrl:
    process.env.LIVEBLOCKS_BASE_URL ?? raise("Missing LIVEBLOCKS_BASE_URL"),
});

function asString(value: unknown) {
  return String(value).replace(/[^0-9]+/g, "") || "0";
}

await liveblocks.mutateStorage("e2e-storage-list", async (root, flush) => {
  const items = root.get("items");

  console.log("Got document:", root.toImmutable());
  items.insert("Mutating storage from the backend...", 0);
  flush();

  await wait(1000);

  for (let i = 1; i < items.length; i++) {
    items.set(i, asString(items.get(i)));
    flush();
    await wait(Math.ceil(Math.random() * 100));
  }

  while (items.length >= 3) {
    // items.get(0) is the "Mutating storage from backend" message...
    const x = asString(items.get(1));
    const y = asString(items.get(2));
    const z = Number(x) + Number(y);

    items.delete(2);
    items.delete(1);
    items.insert(String(z), 1);

    flush();
    await wait(Math.ceil(Math.random() * 300));
  }

  // Cleanup
  for (let i = 0; i < items.length; i++) {
    const item = items.get(i);
    if (typeof item === "string" && item.startsWith("Mutating")) {
      items.delete(i);
    }
  }

  console.log("Final document:", root.toImmutable());
});
