import { describe, expect, test, vi } from "vitest";

import {
  enterConnectAndGetStorage,
  prepareStorageTest,
} from "../../__tests__/_devserver";
import type { LiveText } from "../LiveText";

describe("LiveText reconnect convergence", () => {
  test.each([
    {
      name: "rebases an offline append over a remote prepend (#3704)",
      localIndex: 15,
      localText: " local",
      remoteIndex: 0,
      remoteText: "Remote ",
      expected: "Remote Reconnect title local",
    },
    {
      name: "includes snapshot edits when the replay needs no rebasing",
      localIndex: 0,
      localText: "Local ",
      remoteIndex: 15,
      remoteText: " remote",
      expected: "Local Reconnect title remote",
    },
    {
      name: "reconciles with empty history when the server is already at the requested base",
      localIndex: 15,
      localText: " local",
      remoteIndex: 0,
      remoteText: "",
      expected: "Reconnect title local",
    },
  ])(
    "$name",
    async ({ localIndex, localText, remoteIndex, remoteText, expected }) => {
      const { roomA, roomB, storageA, storageB } = await prepareStorageTest<{
        text: LiveText;
      }>({
        liveblocksType: "LiveObject",
        data: {
          text: {
            liveblocksType: "LiveText",
            data: [["Reconnect title"]],
          },
        },
      });
      const textA = storageA.root.get("text");
      const textB = storageB.root.get("text");

      // Force a new connection/storage snapshot, rather than a brief interruption
      // that might resume the existing connection without replaying pending ops.
      roomA.disconnect();
      textA.insert(localIndex, localText);
      textB.insert(remoteIndex, remoteText);
      await vi.waitFor(() => {
        expect(roomB.getStorageStatus()).toBe("synchronized");
      });

      roomA.connect();
      await vi.waitFor(() => {
        expect(roomA.getStatus()).toBe("connected");
        expect(roomA.getStorageStatus()).toBe("synchronized");
        expect(roomB.getStorageStatus()).toBe("synchronized");
        expect(textB.toString()).toBe(expected);
      });

      // A fresh client reads the server's persisted document, independently of
      // either existing client's optimistic state.
      const { storage: serverStorage } = await enterConnectAndGetStorage<{
        text: LiveText;
      }>(roomA.id);
      expect(serverStorage.root.get("text").toString()).toBe(expected);
      expect(textA.toString()).toBe(expected);
      expect(storageA.root.toJSON()).toEqual(serverStorage.root.toJSON());
    }
  );

  test("reconciles multiple text nodes alongside ordinary offline storage edits", async () => {
    const { roomA, roomB, storageA, storageB } = await prepareStorageTest<{
      title: LiveText;
      body: LiveText;
      status: string;
    }>({
      liveblocksType: "LiveObject",
      data: {
        title: { liveblocksType: "LiveText", data: [["Title"]] },
        body: { liveblocksType: "LiveText", data: [["Body"]] },
        status: "initial",
      },
    });

    // Give the two text nodes different confirmed base versions.
    storageB.root.get("body").insert(4, "!");
    await vi.waitFor(() => {
      expect(roomB.getStorageStatus()).toBe("synchronized");
      expect(storageA.root.get("body").toString()).toBe("Body!");
    });

    roomA.disconnect();
    storageA.root.get("title").insert(5, " local");
    storageA.root.get("body").insert(0, "Local ");
    storageA.root.set("status", "edited offline");
    storageB.root.get("title").insert(0, "Remote ");
    storageB.root.get("body").insert(5, " remote");
    await vi.waitFor(() => {
      expect(roomB.getStorageStatus()).toBe("synchronized");
    });

    roomA.connect();
    const expected = {
      title: [["Remote Title local"]],
      body: [["Local Body! remote"]],
      status: "edited offline",
    };
    await vi.waitFor(() => {
      expect(roomA.getStorageStatus()).toBe("synchronized");
      expect(roomB.getStorageStatus()).toBe("synchronized");
      expect(storageA.root.toJSON()).toEqual(expected);
      expect(storageB.root.toJSON()).toEqual(expected);
    });
  });
});
