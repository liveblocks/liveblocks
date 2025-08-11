import { LiveList } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";
import { describe, test, expect, onTestFinished } from "vitest";

config();

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error hidden config
  baseUrl:
    process.env.LIVEBLOCKS_BASE_URL ??
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ??
    "https://api.liveblocks.io",
});

async function createRandomTestRoom(): Promise<string> {
  const randomRoomId = `node-package-e2e-${Math.random().toString(36).substring(2, 15)}`;

  // Register cleanup
  onTestFinished(async () => {
    await client.deleteRoom(randomRoomId);
  });

  await client.createRoom(
    randomRoomId,
    { defaultAccesses: ["room:write"] },
    { idempotent: true }
  );

  return randomRoomId;
}

describe("@liveblocks/node package e2e", () => {
  test("storage mutation should work in node environment", async () => {
    const roomId = await createRandomTestRoom();

    // delete existing data in the room
    await expect(
      client.mutateStorage(roomId, ({ root }) => {
        root.delete("z");
      })
    ).resolves.toBeUndefined();

    // add data to the room
    await expect(
      client.mutateStorage(roomId, ({ root }) => {
        expect(root.toImmutable()).toEqual({});
        // Mutate it!
        root.set("z", new LiveList([1, 2, 3]));
      })
    ).resolves.toBeUndefined();

    // add data to the room
    await expect(
      client.mutateStorage(roomId, ({ root }) => {
        expect(root.toImmutable()).toEqual({ z: [1, 2, 3] });
      })
    ).resolves.toBeUndefined();
  });
});
