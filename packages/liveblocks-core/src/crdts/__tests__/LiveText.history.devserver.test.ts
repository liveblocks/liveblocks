import { describe, expect, test, vi } from "vitest";

import { prepareStorageTest } from "../../__tests__/_devserver";
import type { LiveText } from "../LiveText";

describe("LiveText history convergence", () => {
  test("an offline update from a deleted lifetime cannot desynchronize two clients", async () => {
    const { roomA, roomB, storageA, storageB } = await prepareStorageTest<{
      text: LiveText;
    }>({
      liveblocksType: "LiveObject",
      data: {
        text: {
          liveblocksType: "LiveText",
          data: [["Hello"]],
        },
      },
    });

    roomB.disconnect();
    storageB.root.get("text").insert(5, "?");

    storageA.root.delete("text");
    roomA.history.undo();

    await vi.waitFor(() => {
      expect(roomA.getStorageStatus()).toBe("synchronized");
    });

    roomB.connect();
    await vi.waitFor(() => {
      expect(roomB.getStatus()).toBe("connected");
      expect(storageB.root.toJSON()).toEqual(storageA.root.toJSON());
      expect(roomB.getStorageStatus()).toBe("synchronized");
    });

    storageA.root.get("text").insert(5, "!");
    await vi.waitFor(() => {
      expect(storageA.root.toJSON()).toEqual({ text: [["Hello!"]] });
      expect(storageB.root.toJSON()).toEqual({ text: [["Hello!"]] });
    });
  });
});
