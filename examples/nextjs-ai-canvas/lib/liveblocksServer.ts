import { Liveblocks } from "@liveblocks/node";

let liveblocksSingleton: Liveblocks | null = null;

export function getLiveblocks() {
  if (liveblocksSingleton) {
    return liveblocksSingleton;
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret?.startsWith("sk_")) {
    throw new Error(
      "LIVEBLOCKS_SECRET_KEY is missing or invalid. Expected a key starting with sk_."
    );
  }

  liveblocksSingleton = new Liveblocks({ secret });
  return liveblocksSingleton;
}
