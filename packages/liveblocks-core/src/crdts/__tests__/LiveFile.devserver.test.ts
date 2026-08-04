/**
 * LiveFile tests that run against the real dev server.
 *
 * For edge cases that require precise control over wire-level ops, see
 * LiveFile.mockserver.test.ts.
 */
import { describe, expect, test, vi } from "vitest";

import { enterAndConnect, enterConnectAndGetStorage, initRoom } from "../../__tests__/_devserver"; // prettier-ignore
import { createStorageFileId } from "../../lib/createIds";
import { LiveFile } from "../LiveFile";
import type { LiveObject } from "../LiveObject";

const CONTENTS = "hello world";

const DEV_SERVER = `http://localhost:${process.env.LIVEBLOCKS_DEV_SERVER_PORT ?? 1154}`;

type ServerStorage = {
  data: Record<string, { data: { size: number } } | undefined>;
};

/**
 * Read a room's Storage straight from the server, bypassing the client's own
 * (optimistic) copy.
 */
async function fetchServerStorage(roomId: string): Promise<ServerStorage> {
  const resp = await fetch(
    `${DEV_SERVER}/v2/rooms/${encodeURIComponent(roomId)}/storage`,
    { headers: { Authorization: "Bearer sk_localdev" } }
  );
  return (await resp.json()) as ServerStorage;
}

function makeFile(name = "hello.txt"): File {
  return new File([CONTENTS], name, { type: "text/plain" });
}

describe("LiveFile", () => {
  test("uploads a file and reports its server-measured metadata", async () => {
    const roomId = await initRoom({ liveblocksType: "LiveObject", data: {} });
    const { room } = await enterAndConnect(roomId);

    const liveFile = await room.uploadFile(makeFile());

    expect(liveFile.name).toEqual("hello.txt");
    expect(liveFile.size).toEqual(CONTENTS.length);
    expect(liveFile.mimeType).toEqual("text/plain");
    expect(liveFile.id).toMatch(/^fl_/);
  });

  test("an uploaded file can be referenced from Storage and read back", async () => {
    const roomId = await initRoom({ liveblocksType: "LiveObject", data: {} });
    const { room, storage } = await enterConnectAndGetStorage(roomId);

    const liveFile = await room.uploadFile(makeFile());
    (storage.root as LiveObject<Record<string, unknown>>).set("file", liveFile);

    await vi.waitFor(() =>
      expect(storage.root.toJSON()).toEqual({
        file: {
          id: liveFile.id,
          name: "hello.txt",
          size: CONTENTS.length,
          mimeType: "text/plain",
        },
      })
    );
  });

  test("getFileUrl returns a URL the bytes can actually be fetched from", async () => {
    const roomId = await initRoom({ liveblocksType: "LiveObject", data: {} });
    const { room, storage } = await enterConnectAndGetStorage(roomId);

    const liveFile = await room.uploadFile(makeFile());
    (storage.root as LiveObject<Record<string, unknown>>).set("file", liveFile);
    await vi.waitFor(() =>
      expect(storage.root.toJSON()).toHaveProperty("file")
    );

    const url = await room.getFileUrl(liveFile);

    // Fetched the way a browser would: no Authorization header
    const resp = await fetch(url);
    expect(resp.status).toEqual(200);
    expect(await resp.text()).toEqual(CONTENTS);
  });

  test("the server's size wins over whatever the client claims", async () => {
    const roomId = await initRoom({ liveblocksType: "LiveObject", data: {} });
    const { room, storage } = await enterConnectAndGetStorage(roomId);

    const uploaded = await room.uploadFile(makeFile());

    // Same file id, but lying about its size
    const liar = new LiveFile({ ...uploaded.data, size: 1 });
    (storage.root as LiveObject<Record<string, unknown>>).set("file", liar);

    // The claim is corrected where it counts. Note this asserts the *server's*
    // view: the lying client keeps its own optimistic value locally, since the
    // ack carries no corrected payload to reconcile against.
    await vi.waitFor(async () => {
      const stored = await fetchServerStorage(roomId);
      expect(stored.data.file?.data.size).toEqual(CONTENTS.length);
    });
  });

  test("getFileUrl fails for a file id nothing knows about", async () => {
    const roomId = await initRoom({ liveblocksType: "LiveObject", data: {} });
    const { room } = await enterAndConnect(roomId);

    await expect(room.getFileUrl(createStorageFileId())).rejects.toThrow();
  });
});
