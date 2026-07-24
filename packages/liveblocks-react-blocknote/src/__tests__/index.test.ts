import { Extension } from "@tiptap/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { LiveblocksExtensionOptions } from "..";
import { useLiveblocksExtension } from "../BlockNoteLiveblocksExtension";
import { withLiveblocksEditorOptions } from "../initialization/liveblocksEditorOptions";
import { useCreateBlockNoteWithLiveblocks } from "../initialization/useCreateBlockNoteWithLiveblocks";

const mocks = vi.hoisted(() => {
  return {
    useCreateBlockNote: vi.fn(),
    useTipTapLiveblocksExtension: vi.fn(),
  };
});

vi.mock("@blocknote/react", () => {
  return {
    useCreateBlockNote: mocks.useCreateBlockNote,
  };
});

vi.mock("@liveblocks/react-tiptap", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@liveblocks/react-tiptap")>();

  return {
    ...actual,
    useLiveblocksExtension: mocks.useTipTapLiveblocksExtension,
  };
});

describe("@liveblocks/react-blocknote", () => {
  beforeEach(() => {
    mocks.useCreateBlockNote.mockReset();
    mocks.useTipTapLiveblocksExtension.mockReset();
    mocks.useTipTapLiveblocksExtension.mockReturnValue({
      config: {},
    });
  });

  test("exports a public LiveblocksExtensionOptions type", () => {
    const options: LiveblocksExtensionOptions = {
      collaborationMode: "liveblocks",
      field: "document",
    };

    expect(options.collaborationMode).toBe("liveblocks");
    expect(options.field).toBe("document");
  });

  test("forwards collaborationMode and injects the blocknote editor type", () => {
    const extension = useLiveblocksExtension({
      collaborationMode: "liveblocks",
      field: "document",
    });

    expect(mocks.useTipTapLiveblocksExtension).toHaveBeenCalledWith({
      collaborationMode: "liveblocks",
      field: "document",
      mentionNodes: false,
      textEditorType: "blocknote",
    });

    // XXX: TipTap's extension type does not expose BlockNote's schema hook.
    const typedExtension = extension as {
      config: {
        extendMarkSchema?: (mark: { name: string }) => Record<string, boolean>;
      };
    };

    expect(
      typedExtension.config.extendMarkSchema?.({
        name: "liveblocksCommentMark",
      })
    ).toEqual({
      blocknoteIgnore: true,
    });
    expect(
      typedExtension.config.extendMarkSchema?.({
        name: "bold",
      })
    ).toEqual({});
  });

  test("keeps BlockNote history disabled in liveblocks mode", () => {
    const liveblocksExtension = Extension.create({
      name: "liveblocksExtension",
    });

    const options = withLiveblocksEditorOptions(
      liveblocksExtension,
      {
        disableExtensions: ["slashMenu"],
      },
      {
        collaborationMode: "liveblocks",
      }
    );

    expect(options.disableExtensions).toEqual(["history", "slashMenu"]);
  });

  test("uses the caller-provided dependencies to create the BlockNote editor", () => {
    const liveblocksExtension = Extension.create({
      name: "liveblocksExtension",
    });
    mocks.useTipTapLiveblocksExtension.mockReturnValue(liveblocksExtension);

    const deps = ["room-id"];

    useCreateBlockNoteWithLiveblocks(
      {},
      {
        collaborationMode: "liveblocks",
      },
      deps
    );

    expect(mocks.useCreateBlockNote).toHaveBeenCalledTimes(1);
    expect(mocks.useCreateBlockNote.mock.calls[0]?.[1]).toBe(deps);
  });
});

test.todo("Write test for _.FloatingComposer");
test.todo("Write test for _.FloatingThreads");
test.todo("Write test for _.AnchoredThreads");
