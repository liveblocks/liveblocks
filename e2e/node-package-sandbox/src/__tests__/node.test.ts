import { LiveList } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";

config();

describe("@liveblocks/node package e2e", () => {
  test("create the room", async () => {
    const client = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
      // @ts-expect-error hidden config
      baseUrl:
        process.env.LIVEBLOCKS_BASE_URL ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ??
        "https://api.liveblocks.io",
    });

    expect(
      await client.createRoom(
        "node-package-e2e",
        { defaultAccesses: ["room:write"] },
        { idempotent: true }
      )
    ).toBeDefined();
  });

  test("storage mutation should work in node environment", async () => {
    const client = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
      // @ts-expect-error hidden config
      baseUrl:
        process.env.LIVEBLOCKS_BASE_URL ??
        process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ??
        "https://api.liveblocks.io",
    });

    // delete existing data in the room
    await expect(
      client.mutateStorage("node-package-e2e", ({ root }) => {
        root.delete("z");
      })
    ).resolves.toBeUndefined();

    // add data to the room
    await expect(
      client.mutateStorage("node-package-e2e", ({ root }) => {
        expect(root.toImmutable()).toEqual({});
        // Mutate it!
        root.set("z", new LiveList([1, 2, 3]));
      })
    ).resolves.toBeUndefined();

    // add data to the room
    await expect(
      client.mutateStorage("node-package-e2e", ({ root }) => {
        expect(root.toImmutable()).toEqual({ z: [1, 2, 3] });
      })
    ).resolves.toBeUndefined();
  });
});
