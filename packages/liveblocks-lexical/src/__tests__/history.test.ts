import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LiveList, LiveObject, LiveText, type Room } from "@liveblocks/client";
import { kInternal, kStorageUpdateSource } from "@liveblocks/core";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isRangeSelection,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_CRITICAL,
  createEditor as createLexicalEditor,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  PASTE_TAG,
  ParagraphNode,
  REDO_COMMAND,
  TextNode,
  UNDO_COMMAND,
  type LexicalEditor,
} from "lexical";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../../liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import { registerLiveblocksHistory } from "../history";
import { LiveblocksCollaborationManager } from "../manager";
import type { LiveElementNode, LiveRootNode, LiveTextNode } from "../types";

describe("registerLiveblocksHistory", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("commands", () => {
    test("undo/redo restores Storage via room.history", async () => {
      const { room, content } = await createRoomWithText("Hello");
      // Capture uses setTimeout — fake only after room async setup finishes.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // History first, then Lexical → Storage (same order as the plugin).
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("Hello!");

      // Flush the open capture via the idle timer.
      vi.advanceTimersByTime(1000);
      expect(room.history.canUndo()).toBe(true);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");
      expect(room.history.canRedo()).toBe(true);

      editor.dispatchCommand(REDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello!");

      unregisterSync();
      unregisterHistory();
    });

    test("undo/redo projects Storage back into Lexical", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // Constructor schedules a non-discrete binding update; flush it first.
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      // Storage → Lexical, including local via:"history" (undo/redo).
      const unsubscribeStorage = room.subscribe(
        document,
        (updates) => {
          if (
            updates.every((update) => {
              const source = update[kStorageUpdateSource];
              return source?.origin === "local" && source.via === "mutation";
            })
          ) {
            return;
          }

          const isFromHistory = updates.some((update) => {
            const source = update[kStorageUpdateSource];
            return source?.origin === "local" && source.via === "history";
          });

          editor.update(
            () => {
              manager.$applyRemoteUpdates(updates);
            },
            {
              skipTransforms: true,
              tag: isFromHistory ? HISTORIC_TAG : COLLABORATION_TAG,
            }
          );
        },
        { isDeep: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("Hello!");
      expect(
        editor.getEditorState().read(() => $getRoot().getTextContent())
      ).toBe("Hello!");

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      // Nested historic editor.update commits on a microtask.
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(
        editor.getEditorState().read(() => $getRoot().getTextContent())
      ).toBe("Hello");

      editor.dispatchCommand(REDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello!");
      expect(
        editor.getEditorState().read(() => $getRoot().getTextContent())
      ).toBe("Hello!");

      unsubscribeStorage();
      unregisterSync();
      unregisterHistory();
    });

    test("UNDO_COMMAND returns false when the stack is empty", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);

      expect(editor.dispatchCommand(UNDO_COMMAND, undefined)).toBe(false);
      expect(content.toString()).toBe("Hello");

      unregisterHistory();
    });

    test("REDO_COMMAND returns false when the redo stack is empty", async () => {
      const { room } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);

      expect(editor.dispatchCommand(REDO_COMMAND, undefined)).toBe(false);

      unregisterHistory();
    });

    test("commits the open capture group before undo", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("Hello!");
      // Still paused — nothing on the real undo stack yet.
      expect(room[kInternal].undoStack).toHaveLength(0);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);

      unregisterSync();
      unregisterHistory();
    });

    test("commits the open capture group before redo", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);
      expect(room.history.canRedo()).toBe(false);

      // Redo with an empty redo stack must still flush the open capture
      // (redo would otherwise discard pausedHistory).
      expect(editor.dispatchCommand(REDO_COMMAND, undefined)).toBe(false);
      expect(room[kInternal].undoStack).toHaveLength(1);
      expect(content.toString()).toBe("Hello!");
      expect(room.history.canUndo()).toBe(true);

      unregisterSync();
      unregisterHistory();
    });

    test("CLEAR_HISTORY_COMMAND empties the stacks without changing Storage", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);
      expect(room.history.canUndo()).toBe(true);

      expect(editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)).toBe(
        true
      );
      expect(room.history.canUndo()).toBe(false);
      expect(room.history.canRedo()).toBe(false);
      expect(content.toString()).toBe("Hello!");

      unregisterSync();
      unregisterHistory();
    });

    test("CLEAR_EDITOR_COMMAND clears history and returns false", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)).toBe(
        false
      );
      expect(room.history.canUndo()).toBe(false);
      expect(content.toString()).toBe("Hello!");

      unregisterSync();
      unregisterHistory();
    });

    test("dispatches CAN_UNDO / CAN_REDO as the stack changes", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      let canUndo = false;
      let canRedo = false;
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          canUndo = payload;
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      );
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          canRedo = payload;
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      );

      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      expect(canUndo).toBe(false);
      expect(canRedo).toBe(false);

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);
      expect(canUndo).toBe(true);
      expect(canRedo).toBe(false);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(canUndo).toBe(false);
      expect(canRedo).toBe(true);

      editor.dispatchCommand(REDO_COMMAND, undefined);
      expect(canUndo).toBe(true);
      expect(canRedo).toBe(false);

      unregisterSync();
      unregisterHistory();
    });

    test("a new edit after undo clears the redo stack", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // Need Storage → Lexical so undo leaves the editor matching Storage
      // before the branching edit.
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );
      const unsubscribeStorage = room.subscribe(
        document,
        (updates) => {
          if (
            updates.every((update) => {
              const source = update[kStorageUpdateSource];
              return source?.origin === "local" && source.via === "mutation";
            })
          ) {
            return;
          }

          const isFromHistory = updates.some((update) => {
            const source = update[kStorageUpdateSource];
            return source?.origin === "local" && source.via === "history";
          });

          editor.update(
            () => {
              manager.$applyRemoteUpdates(updates);
            },
            {
              skipTransforms: true,
              tag: isFromHistory ? HISTORIC_TAG : COLLABORATION_TAG,
            }
          );
        },
        { isDeep: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(room.history.canRedo()).toBe(true);

      // Branching edit — redo of "!" must be discarded.
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      // Mutation-while-paused must clear redo immediately (before idle commit).
      expect(content.toString()).toBe("Hello?");
      expect(room.history.canRedo()).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(room.history.canUndo()).toBe(true);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();
      expect(content.toString()).toBe("Hello");
      expect(room.history.canRedo()).toBe(true);

      editor.dispatchCommand(REDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();
      expect(content.toString()).toBe("Hello?");
      expect(room.history.canRedo()).toBe(false);

      unsubscribeStorage();
      unregisterSync();
      unregisterHistory();
    });

    test("historic projection does not echo back into Storage", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      const unsubscribeStorage = room.subscribe(
        document,
        (updates) => {
          if (
            updates.every((update) => {
              const source = update[kStorageUpdateSource];
              return source?.origin === "local" && source.via === "mutation";
            })
          ) {
            return;
          }

          const isFromHistory = updates.some((update) => {
            const source = update[kStorageUpdateSource];
            return source?.origin === "local" && source.via === "history";
          });

          editor.update(
            () => {
              manager.$applyRemoteUpdates(updates);
            },
            {
              skipTransforms: true,
              tag: isFromHistory ? HISTORIC_TAG : COLLABORATION_TAG,
            }
          );
        },
        { isDeep: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(
        editor.getEditorState().read(() => $getRoot().getTextContent())
      ).toBe("Hello");

      // If HISTORIC_TAG failed to skip Lexical → Storage, a new capture would
      // open and the idle timer would push another undo item.
      vi.advanceTimersByTime(1000);
      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);
      expect(room[kInternal].undoStack).toHaveLength(0);

      unsubscribeStorage();
      unregisterSync();
      unregisterHistory();
    });

    test("unregister commits any open capture group", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);

      unregisterSync();
      unregisterHistory();
      expect(room[kInternal].undoStack).toHaveLength(1);
      expect(content.toString()).toBe("Hello!");
    });
  });

  describe("grouping", () => {
    test("merges consecutive dirty edits while the capture is open", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!?");
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);

      unregisterSync();
      unregisterHistory();
    });

    test("starts a new undo item after the idle timer commits", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!?");
      expect(room[kInternal].undoStack.length).toBeGreaterThanOrEqual(2);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello!");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("resets the idle timer when the capture is extended", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(800);

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          // Resets the idle window.
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(800);
      // Still capturing — first timer was cleared; second has 200ms left.
      expect(room[kInternal].undoStack).toHaveLength(0);

      vi.advanceTimersByTime(200);
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("does not close the capture on selection-only updates", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );

      // Caret moves: dirtyLeaves/Elements empty — must not commit capture.
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.select(0, 0);
        },
        { discrete: true }
      );
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.select(3, 3);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!?");
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("ignores collaboration-tagged updates for capture", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true, tag: COLLABORATION_TAG }
      );
      vi.advanceTimersByTime(1000);

      // Sync also skips COLLABORATION_TAG — Storage unchanged, no capture.
      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);

      unregisterSync();
      unregisterHistory();
    });

    test("ignores historic-tagged updates for capture", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true, tag: HISTORIC_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);

      unregisterSync();
      unregisterHistory();
    });

    test("historic and collaboration updates do not disturb an open capture", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);

      // Mid-capture peer/undo projections must not commit the pause group.
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("X");
        },
        { discrete: true, tag: COLLABORATION_TAG }
      );
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("Y");
        },
        { discrete: true, tag: HISTORIC_TAG }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);
      vi.advanceTimersByTime(1000);

      // One stack item for the whole capture (tagged updates never committed).
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("merges structural dirty edits within the idle window", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      // Sync full document text so paragraph splits are reflected in Storage.
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );

      // Paragraph insert dirties elements — still one capture with the insert.
      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode("World"))
          );
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      // Lexical joins blocks with "\n\n" in getTextContent().
      expect(content.toString()).toBe("Hello!\n\nWorld");
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });
  });

  describe("boundaries", () => {
    test("treats PASTE_TAG as a hard undo boundary", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.clear();
          paragraph.append($createTextNode("Hello!PASTE"));
        },
        { discrete: true, tag: PASTE_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!PASTE");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello!");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("treats HISTORY_PUSH_TAG as a hard boundary within the idle window", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true, tag: HISTORY_PUSH_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!?");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello!");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("HISTORY_MERGE_TAG prevents PASTE_TAG from splitting the capture", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      // MERGE is checked before hard boundaries — paste must not commit.
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.clear();
          paragraph.append($createTextNode("Hello!PASTE"));
        },
        { discrete: true, tag: [HISTORY_MERGE_TAG, PASTE_TAG] }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello!PASTE");
      expect(room[kInternal].undoStack).toHaveLength(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("HISTORY_MERGE_TAG extends an open capture like a normal dirty edit", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true, tag: HISTORY_MERGE_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(room[kInternal].undoStack).toHaveLength(1);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });

    test("two PASTE_TAG updates within the idle window stay separate", async () => {
      const { room, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const unregisterHistory = registerLiveblocksHistory(editor, room);
      const unregisterSync = editor.registerUpdateListener(
        ({ tags, editorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }
          editorState.read(() => {
            const plain = $getRoot().getTextContent();
            room.batch(() => {
              const current = content.toString();
              if (current === plain) return;
              content.delete(0, current.length);
              if (plain.length > 0) content.insert(0, plain);
            });
          });
        }
      );

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.clear();
          paragraph.append($createTextNode("HelloA"));
        },
        { discrete: true, tag: PASTE_TAG }
      );
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.clear();
          paragraph.append($createTextNode("HelloAB"));
        },
        { discrete: true, tag: PASTE_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("HelloAB");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("HelloA");

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(content.toString()).toBe("Hello");

      unregisterSync();
      unregisterHistory();
    });
  });
});

async function createRoomWithText(text: string = "Hello") {
  // Room setup uses real async I/O — must run before fake timers.
  const { room, root } = (await prepareIsolatedStorageTest(
    [createSerializedRoot()],
    0
  )) as unknown as {
    room: Room;
    root: LiveObject<{ document?: LiveRootNode }>;
  };

  room.history.disable(() => {
    root.set(
      "document",
      new LiveObject({
        kind: "root",
        type: "root",
        version: 1,
        children: new LiveList<LiveElementNode>([
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText(text),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  const document = root.get("document") as LiveRootNode;
  const content = (
    document.get("children").get(0)!.get("children").get(0)! as LiveTextNode
  ).get("content");

  return { room, document, content };
}

function createEditor(text: string = "Hello"): LexicalEditor {
  const editor = createLexicalEditor({
    namespace: "history-test",
    nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
  });
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true }
  );
  return editor;
}
