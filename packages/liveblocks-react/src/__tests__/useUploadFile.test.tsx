import { LiveFile } from "@liveblocks/client";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createContextsForTest } from "./_utils";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUploadFile", () => {
  test("returns a stable function that uploads through the current room", async () => {
    const {
      room: { RoomProvider, useRoom, useUploadFile },
    } = createContextsForTest();
    const { result, rerender } = renderHook(
      () => ({ room: useRoom(), uploadFile: useUploadFile() }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room" autoConnect={false}>
            {children}
          </RoomProvider>
        ),
      }
    );
    const liveFile = new LiveFile({
      id: "fl_123456789012345678901",
      name: "notes.txt",
      size: 5,
      mimeType: "text/plain",
    });
    const uploadFileMock = vi
      .spyOn(result.current.room, "uploadFile")
      .mockResolvedValue(liveFile);
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const abortController = new AbortController();
    const initialUploadFile = result.current.uploadFile;

    await expect(
      initialUploadFile(file, { signal: abortController.signal })
    ).resolves.toBe(liveFile);
    expect(uploadFileMock).toHaveBeenCalledWith(file, {
      signal: abortController.signal,
    });

    rerender();
    expect(result.current.uploadFile).toBe(initialUploadFile);
  });
});
