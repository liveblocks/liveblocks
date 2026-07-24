import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  LiveList,
  LiveMap,
  LiveObject,
  LiveText,
  type Room,
} from "@liveblocks/client";
import { kInternal, kStorageUpdateSource } from "@liveblocks/core";
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_CRITICAL,
  createEditor as createLexicalEditor,
  DecoratorNode,
  ElementNode,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  PASTE_TAG,
  ParagraphNode,
  REDO_COMMAND,
  TextNode,
  UNDO_COMMAND,
  type EditorConfig,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSerializedRoot,
  prepareIsolatedStorageTest,
} from "../../../liveblocks-core/src/__tests__/_MockWebSocketServer.setup";
import { LiveblocksCollaboration } from "../collaboration";
import { LiveblocksHistory } from "../history";
import {
  $getLexicalNodeProps,
  LiveblocksCollaborationManager,
} from "../manager";
import type {
  LiveDecoratorNode,
  LiveElementNode,
  LiveRootNode,
  LiveTextNode,
} from "../types";

describe("LiveblocksHistory", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("commands", () => {
    test("undo/redo restores Storage via room.history", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      // Capture uses setTimeout — fake only after room async setup finishes.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // History first, then Lexical → Storage (same order as the plugin).
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("undo/redo projects Storage back into Lexical", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // Constructor schedules a non-discrete binding update; flush it first.
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("UNDO_COMMAND returns false when the stack is empty", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();

      expect(editor.dispatchCommand(UNDO_COMMAND, undefined)).toBe(false);
      expect(content.toString()).toBe("Hello");

      history.unregister();
    });

    test("REDO_COMMAND returns false when the redo stack is empty", async () => {
      const { room, document } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();

      expect(editor.dispatchCommand(REDO_COMMAND, undefined)).toBe(false);

      history.unregister();
    });

    test("commits the open capture group before undo", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("commits the open capture group before redo", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("CLEAR_HISTORY_COMMAND empties the stacks without changing Storage", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("CLEAR_EDITOR_COMMAND clears history and returns false", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("dispatches CAN_UNDO / CAN_REDO as the stack changes", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
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

      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("a new edit after undo clears the redo stack", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      // Need Storage → Lexical so undo leaves the editor matching Storage
      // before the branching edit.
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("historic projection does not echo back into Storage", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");

      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });

      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("unregister commits any open capture group", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
          }
          textNode.selectEnd().insertText("!");
        },
        { discrete: true }
      );
      expect(room[kInternal].undoStack).toHaveLength(0);

      unregisterSync();
      history.unregister();
      expect(room[kInternal].undoStack).toHaveLength(1);
      expect(content.toString()).toBe("Hello!");
    });
  });

  describe("grouping", () => {
    test("merges consecutive dirty edits while the capture is open", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("starts a new undo item after the idle timer commits", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("resets the idle timer when the capture is extended", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("does not close the capture on selection-only updates", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("ignores collaboration-tagged updates for capture", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("ignores historic-tagged updates for capture", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
          }
          textNode.selectEnd().insertText("?");
        },
        { discrete: true, tag: HISTORIC_TAG }
      );
      vi.advanceTimersByTime(1000);

      expect(content.toString()).toBe("Hello");
      expect(room.history.canUndo()).toBe(false);

      unregisterSync();
      history.unregister();
    });

    test("historic and collaboration updates do not disturb an open capture", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("merges structural dirty edits within the idle window", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });
  });

  describe("boundaries", () => {
    test("treats PASTE_TAG as a hard undo boundary", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("treats HISTORY_PUSH_TAG as a hard boundary within the idle window", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("HISTORY_MERGE_TAG prevents PASTE_TAG from splitting the capture", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("HISTORY_MERGE_TAG extends an open capture like a normal dirty edit", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
            throw new Error("Expected text node");
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
            throw new Error("Expected text node");
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
      history.unregister();
    });

    test("two PASTE_TAG updates within the idle window stay separate", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const manager = new LiveblocksCollaborationManager(document, editor);
      editor.update(() => {}, { discrete: true });
      const history = new LiveblocksHistory(editor, room, manager);
      history.register();
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
      history.unregister();
    });
  });

  describe("selection restore", () => {
    test("undo restores the caret from before a local insert", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      // Capture uses setTimeout — fake only after room async setup finishes.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      // Constructor schedules a non-discrete binding update; flush it first.
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      // Prefer $setSelection over TextNode.select() for selection-only updates —
      // the latter can dirty the text node and open a capture with the wrong before.
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 5, "text");
          selection.focus.set(textNode.getKey(), 5, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          textNode.select(5, 5).insertText("!");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("Hello!");

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      // Nested historic editor.update commits on a microtask.
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return {
            offset: selection.anchor.offset,
            collapsed: selection.isCollapsed(),
            type: selection.anchor.type,
          };
        })
      ).toEqual({ offset: 5, collapsed: true, type: "text" });

      collaboration.unregister();
    });

    test("redo restores the caret from after a local insert", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 5, "text");
          selection.focus.set(textNode.getKey(), 5, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          textNode.select(5, 5).insertText("!");
        },
        { discrete: true }
      );

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      editor.dispatchCommand(REDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello!");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return {
            offset: selection.anchor.offset,
            collapsed: selection.isCollapsed(),
            type: selection.anchor.type,
          };
        })
      ).toEqual({ offset: 6, collapsed: true, type: "text" });

      collaboration.unregister();
    });

    test("undo restores a mid-text caret after insert", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 2, "text");
          selection.focus.set(textNode.getKey(), 2, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          textNode.select(2, 2).insertText("X");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("HeXllo");

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return {
            offset: selection.anchor.offset,
            collapsed: selection.isCollapsed(),
            type: selection.anchor.type,
          };
        })
      ).toEqual({ offset: 2, collapsed: true, type: "text" });

      collaboration.unregister();
    });

    test("continuing to type after undo does not use a stale before selection", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      // Cycle 1: He|llo → HeXllo → undo → He|llo
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 2, "text");
          selection.focus.set(textNode.getKey(), 2, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          textNode.select(2, 2).insertText("X");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("HeXllo");

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return selection.anchor.offset;
        })
      ).toBe(2);

      // Cycle 2: insert again from the restored caret — no fresh selection-only
      // update. After undo, collaboration sets `history.pendingBefore` from a
      // freshly encoded selection. Without that, `#pendingBefore` would still
      // be the previous item's `after` (offset 3) and this undo would land on
      // Hell|o.
      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          textNode.select(2, 2).insertText("X");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("HeXllo");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return selection.anchor.offset;
        })
      ).toBe(3);

      vi.advanceTimersByTime(1000);

      let restoreOnSecondUndo: { offset: number } | null = null;
      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const restore = collaboration.history.pendingRestore;
        if (restore === null) return;
        restoreOnSecondUndo = { offset: restore.storage.anchor.offset };
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello");
      expect(restoreOnSecondUndo).toEqual({ offset: 2 });
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return selection.anchor.offset;
        })
      ).toBe(2);

      collaboration.unregister();
    });

    test("DIAG dirty flags on first selection after collab init", async () => {
      const { room, document } = await createRoomWithText("First");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("First");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      const observations: Array<{
        dirtyLeaves: number;
        dirtyElements: number;
        tags: string[];
        binding: number;
        encoded: unknown;
      }> = [];

      const unsub = editor.registerUpdateListener(
        ({ editorState, dirtyLeaves, dirtyElements, tags }) => {
          observations.push(
            editorState.read(() => ({
              dirtyLeaves: dirtyLeaves.size,
              dirtyElements: dirtyElements.size,
              tags: [...tags],
              binding: collaboration.manager.binding.reverse.size,
              encoded: collaboration.manager.$encodeSelection(),
            }))
          );
        }
      );

      // First selection after init
      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 1, "text");
          selection.focus.set(text.getKey(), 4, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      unsub();
      // Soft assert — print via expect for visibility
      expect(observations).toEqual([
        expect.objectContaining({
          dirtyLeaves: 0,
          dirtyElements: 0,
        }),
      ]);

      collaboration.unregister();
    });

    test("DIAG select then delete without discrete (raf-batched)", async () => {
      const { room, document } = await createRoomWithText("First");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("First");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      // Non-discrete: Lexical may merge updates in the same flush window.
      editor.update(() => {
        const text = (
          $getRoot().getFirstChild() as ParagraphNode
        ).getFirstChild();
        if (text === null || !$isTextNode(text)) {
          throw new Error("Expected text node");
        }
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 1, "text");
        selection.focus.set(text.getKey(), 4, "text");
        $setSelection(selection);
      });

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error("Expected range selection");
        }
        selection.removeText();
      });

      // Flush pending Lexical updates
      editor.update(() => {}, { discrete: true });

      const content = (
        (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
      ).get("content");
      expect(content.toString()).toBe("Ft");

      vi.advanceTimersByTime(1000);

      let restore: { a: number; f: number } | null = null;
      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const r = collaboration.history.pendingRestore;
        if (r === null) return;
        restore = { a: r.lexical.anchor.offset, f: r.lexical.focus.offset };
      });
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect({
        restore,
        selection: editor.read(() => {
          const s = $getSelection();
          if (!$isRangeSelection(s)) return null;
          return {
            a: s.anchor.offset,
            f: s.focus.offset,
            c: s.isCollapsed(),
          };
        }),
      }).toEqual({
        restore: { a: 1, f: 4 },
        selection: { a: 1, f: 4, c: false },
      });

      collaboration.unregister();
    });

    test("DIAG first selection before binding flush then delete", async () => {
      const { room, document } = await createRoomWithText("First");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("First");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      // No binding flush — simulate racing first interaction.
      collaboration.register();

      const encBeforeFlush = editor.read(() => ({
        binding: collaboration.manager.binding.reverse.size,
        encoded: collaboration.manager.$encodeSelection(),
      }));

      // Selection against pre-rebuild keys (createEditor tree), while manager
      // rebuild may still be pending.
      editor.update(() => {
        const text = (
          $getRoot().getFirstChild() as ParagraphNode
        ).getFirstChild();
        if (text === null || !$isTextNode(text)) {
          throw new Error("Expected text node");
        }
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 1, "text");
        selection.focus.set(text.getKey(), 4, "text");
        $setSelection(selection);
      });

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error("Expected range selection");
        }
        selection.removeText();
      });

      editor.update(() => {}, { discrete: true });

      const content = (
        (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
      ).get("content");

      vi.advanceTimersByTime(1000);

      let restore: unknown = "unset";
      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        restore = collaboration.history.pendingRestore;
      });
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect({
        encBeforeFlush,
        content: content.toString(),
        restore,
        selection: editor.read(() => {
          const s = $getSelection();
          if (!$isRangeSelection(s)) return null;
          return {
            a: s.anchor.offset,
            f: s.focus.offset,
            c: s.isCollapsed(),
          };
        }),
      }).toEqual({
        encBeforeFlush: expect.anything(),
        content: "First",
        restore: expect.objectContaining({
          lexical: expect.objectContaining({
            anchor: expect.objectContaining({ offset: 1 }),
          }),
        }),
        selection: { a: 1, f: 4, c: false },
      });

      collaboration.unregister();
    });

    test("undo restores a partial text range selection after delete", async () => {
      const { room, document } = await createRoomWithText("First");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("First");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 1, "text");
          selection.focus.set(text.getKey(), 4, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      const content = (
        (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
      ).get("content");
      expect(content.toString()).toBe("Ft");

      vi.advanceTimersByTime(1000);

      let restoreAtUndo: {
        storageAnchor: number;
        storageFocus: number;
        lexicalAnchor: number;
        lexicalFocus: number;
        decodeAnchor: number | null;
      } | null = null;

      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const restore = collaboration.history.pendingRestore;
        if (restore === null) return;
        restoreAtUndo = {
          storageAnchor: restore.storage.anchor.offset,
          storageFocus: restore.storage.focus.offset,
          lexicalAnchor: restore.lexical.anchor.offset,
          lexicalFocus: restore.lexical.focus.offset,
          decodeAnchor: content[kInternal].decodeIndex(
            restore.storage.anchor.offset,
            restore.storage.anchor.version
          ),
        };
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("First");
      // Storage decode still remaps the left edge (1 → 4), but Lexical
      // snapshot keeps the pre-delete offsets and is preferred when the key
      // is still bound.
      expect(restoreAtUndo).toEqual({
        storageAnchor: 1,
        storageFocus: 4,
        lexicalAnchor: 1,
        lexicalFocus: 4,
        decodeAnchor: 4,
      });
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return {
            anchor: {
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focus: {
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        anchor: { offset: 1, type: "text" },
        focus: { offset: 4, type: "text" },
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("undo restores a multi-paragraph range selection after delete", async () => {
      const { room, document } = await createTwoParagraphRoom();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration } = createCollaborationFromDocument(
        room,
        document
      );

      editor.update(
        () => {
          const paragraphs = $getRoot()
            .getChildren()
            .filter($isParagraphNode) as ParagraphNode[];
          const first = paragraphs[0]!;
          const secondText = paragraphs[1]!.getFirstChild();
          if (secondText === null || !$isTextNode(secondText)) {
            throw new Error("Expected text in second paragraph");
          }

          const selection = $createRangeSelection();
          selection.anchor.set(first.getKey(), 0, "element");
          selection.focus.set(
            secondText.getKey(),
            secondText.getTextContentSize(),
            "text"
          );
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      expect(document.get("children").length).toBe(1);

      vi.advanceTimersByTime(1000);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(document.get("children").length).toBe(2);
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const paragraphs = $getRoot()
            .getChildren()
            .filter($isParagraphNode) as ParagraphNode[];
          const first = paragraphs[0]!;
          const secondText = paragraphs[1]!.getFirstChild();
          if (secondText === null || !$isTextNode(secondText)) {
            return null;
          }
          return {
            anchorMatchesFirst: selection.anchor.key === first.getKey(),
            anchor: {
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focusMatchesSecondText: selection.focus.key === secondText.getKey(),
            focus: {
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        anchorMatchesFirst: true,
        anchor: { offset: 0, type: "element" },
        focusMatchesSecondText: true,
        focus: { offset: 6, type: "text" },
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("undo restores text-to-text multi-paragraph selection offsets after delete", async () => {
      const { room, document } = await createTwoParagraphRoom();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration, manager } =
        createCollaborationFromDocument(room, document);

      editor.update(
        () => {
          const paragraphs = $getRoot()
            .getChildren()
            .filter($isParagraphNode) as ParagraphNode[];
          const firstText = paragraphs[0]!.getFirstChild();
          const secondText = paragraphs[1]!.getFirstChild();
          if (
            firstText === null ||
            !$isTextNode(firstText) ||
            secondText === null ||
            !$isTextNode(secondText)
          ) {
            throw new Error("Expected text in both paragraphs");
          }

          const selection = $createRangeSelection();
          selection.anchor.set(firstText.getKey(), 1, "text");
          selection.focus.set(
            secondText.getKey(),
            secondText.getTextContentSize(),
            "text"
          );
          $setSelection(selection);
        },
        { discrete: true }
      );

      const beforeSelection = editor.read(() => manager.$encodeSelection());
      expect(beforeSelection).not.toBeNull();
      expect(beforeSelection!.anchor.offset).toBe(1);
      expect(beforeSelection!.focus.offset).toBe(6);

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      vi.advanceTimersByTime(1000);

      let decodeAtUndo: {
        storageAnchor: number;
        lexicalAnchor: number;
        decodeAnchor: number | null;
      } | null = null;
      const firstContent = (
        (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
      ).get("content");

      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const restore = collaboration.history.pendingRestore;
        if (restore === null) return;
        decodeAtUndo = {
          storageAnchor: restore.storage.anchor.offset,
          lexicalAnchor: restore.lexical.anchor.offset,
          decodeAnchor: firstContent[kInternal].decodeIndex(
            restore.storage.anchor.offset,
            restore.storage.anchor.version
          ),
        };
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      // Storage decode remaps surviving first-paragraph endpoint (1 → 5);
      // Lexical snapshot keeps offset 1 and is preferred when the key survives.
      // Focus on the recreated second paragraph falls back to storage decode.
      expect(decodeAtUndo).toEqual({
        storageAnchor: 1,
        lexicalAnchor: 1,
        decodeAnchor: 5,
      });
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const paragraphs = $getRoot()
            .getChildren()
            .filter($isParagraphNode) as ParagraphNode[];
          const firstText = paragraphs[0]!.getFirstChild();
          const secondText = paragraphs[1]!.getFirstChild();
          if (
            firstText === null ||
            !$isTextNode(firstText) ||
            secondText === null ||
            !$isTextNode(secondText)
          ) {
            return null;
          }
          return {
            anchorMatchesFirstText: selection.anchor.key === firstText.getKey(),
            anchor: {
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focusMatchesSecondText: selection.focus.key === secondText.getKey(),
            focus: {
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        anchorMatchesFirstText: true,
        anchor: { offset: 1, type: "text" },
        focusMatchesSecondText: true,
        focus: { offset: 6, type: "text" },
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("redo restores the post-delete collapsed caret after multi-paragraph delete", async () => {
      const { room, document } = await createTwoParagraphRoom();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration, manager } =
        createCollaborationFromDocument(room, document);

      editor.update(
        () => {
          const paragraphs = $getRoot()
            .getChildren()
            .filter($isParagraphNode) as ParagraphNode[];
          const first = paragraphs[0]!;
          const secondText = paragraphs[1]!.getFirstChild();
          if (secondText === null || !$isTextNode(secondText)) {
            throw new Error("Expected text in second paragraph");
          }

          const selection = $createRangeSelection();
          selection.anchor.set(first.getKey(), 0, "element");
          selection.focus.set(
            secondText.getKey(),
            secondText.getTextContentSize(),
            "text"
          );
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      vi.advanceTimersByTime(1000);

      const afterDeleteSelection = editor.read(() =>
        manager.$encodeSelection()
      );
      expect(afterDeleteSelection).not.toBeNull();
      expect(afterDeleteSelection!.anchor).toEqual(afterDeleteSelection!.focus);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      editor.dispatchCommand(REDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(document.get("children").length).toBe(1);
      const restored = editor.read(() => manager.$encodeSelection());
      expect(restored).not.toBeNull();
      expect(restored!.anchor).toEqual(afterDeleteSelection!.anchor);
      expect(restored!.focus).toEqual(afterDeleteSelection!.focus);
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return selection.isCollapsed();
        })
      ).toBe(true);

      collaboration.unregister();
    });

    test("clearing history does not leave a pending selection restore", async () => {
      const { room, document, content } = await createRoomWithText("Hello");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hello");
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const textNode = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (textNode === null || !$isTextNode(textNode)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(textNode.getKey(), 2, "text");
          selection.focus.set(textNode.getKey(), 4, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.insertText("X");
        },
        { discrete: true }
      );
      expect(content.toString()).toBe("HeXo");

      vi.advanceTimersByTime(1000);
      room.history.clear();

      expect(collaboration.history.pendingRestore).toBeNull();
      expect(room.history.canUndo()).toBe(false);

      collaboration.unregister();
    });

    test("undo restores a range selection after deleting across mixed formatting", async () => {
      // "Hello " (plain) + "world" (bold). Select from offset 3 in plain
      // through the bold span, delete, undo — selection should cover
      // "lo world" again (flat 3–11), even if TextNode keys are recreated.
      const { room, document, content } = await createRoomWithFormattedText([
        ["Hello "],
        ["world", { bold: true }],
      ]);
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration, manager } =
        createCollaborationFromDocument(room, document);

      expect(content.toString()).toBe("Hello world");
      expect(
        editor.read(() => {
          const texts = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getChildren();
          return texts.map((node) => {
            if (!$isTextNode(node)) return null;
            return {
              text: node.getTextContent(),
              bold: node.hasFormat("bold"),
            };
          });
        })
      ).toEqual([
        { text: "Hello ", bold: false },
        { text: "world", bold: true },
      ]);

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const plain = paragraph.getFirstChild();
          const bold = paragraph.getLastChild();
          if (
            plain === null ||
            !$isTextNode(plain) ||
            bold === null ||
            !$isTextNode(bold)
          ) {
            throw new Error("Expected plain + bold text nodes");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(plain.getKey(), 3, "text");
          selection.focus.set(bold.getKey(), bold.getTextContentSize(), "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      const beforeSelection = editor.read(() => manager.$encodeSelection());
      expect(beforeSelection).not.toBeNull();
      expect(beforeSelection!.anchor.offset).toBe(3);
      expect(beforeSelection!.focus.offset).toBe(11);

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      expect(content.toString()).toBe("Hel");
      vi.advanceTimersByTime(1000);

      let restoreAtUndo: {
        storageAnchor: number;
        storageFocus: number;
        localAnchor: number;
        localFocus: number;
        lexicalAnchorOffset: number;
        lexicalFocusOffset: number;
        decodeAnchor: number | null;
      } | null = null;

      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const restore = collaboration.history.pendingRestore;
        if (restore === null) return;
        restoreAtUndo = {
          storageAnchor: restore.storage.anchor.offset,
          storageFocus: restore.storage.focus.offset,
          localAnchor: restore.local.anchor.offset,
          localFocus: restore.local.focus.offset,
          lexicalAnchorOffset: restore.lexical.anchor.offset,
          lexicalFocusOffset: restore.lexical.focus.offset,
          decodeAnchor: content[kInternal].decodeIndex(
            restore.storage.anchor.offset,
            restore.storage.anchor.version
          ),
        };
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello world");
      // Storage decode remaps the left edge (3 → 11). Local flat offsets keep
      // the pre-delete range and are used when Lexical keys were recreated.
      expect(restoreAtUndo).toEqual({
        storageAnchor: 3,
        storageFocus: 11,
        localAnchor: 3,
        localFocus: 11,
        lexicalAnchorOffset: 3,
        lexicalFocusOffset: 5,
        decodeAnchor: 11,
      });

      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const plain = paragraph.getFirstChild();
          const bold = paragraph.getLastChild();
          if (
            plain === null ||
            !$isTextNode(plain) ||
            bold === null ||
            !$isTextNode(bold)
          ) {
            return null;
          }
          return {
            text: $getRoot().getTextContent(),
            segments: paragraph.getChildren().map((node) => {
              if (!$isTextNode(node)) return null;
              return {
                text: node.getTextContent(),
                bold: node.hasFormat("bold"),
              };
            }),
            anchorMatchesPlain: selection.anchor.key === plain.getKey(),
            anchor: {
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focusMatchesBold: selection.focus.key === bold.getKey(),
            focus: {
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        text: "Hello world",
        segments: [
          { text: "Hello ", bold: false },
          { text: "world", bold: true },
        ],
        anchorMatchesPlain: true,
        anchor: { offset: 3, type: "text" },
        focusMatchesBold: true,
        focus: { offset: 5, type: "text" },
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("undo selection restore ignores stale reverse bindings for detached keys", async () => {
      // Repro: binding.reverse.has(key) can stay true for a key that
      // $getNodeByKey returns null for. Preferring that lexical snapshot
      // used to throw PointType.set: node with key X is [not found].
      const { room, document, content } = await createRoomWithFormattedText([
        ["Hello "],
        ["world", { bold: true }],
      ]);
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration, manager } =
        createCollaborationFromDocument(room, document);

      const liveText = (
        document.get("children").get(0) as LiveElementNode
      )
        .get("children")
        .get(0)! as LiveTextNode;

      let staleAnchorKey: string | null = null;
      let staleFocusKey: string | null = null;

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const plain = paragraph.getFirstChild();
          const bold = paragraph.getLastChild();
          if (
            plain === null ||
            !$isTextNode(plain) ||
            bold === null ||
            !$isTextNode(bold)
          ) {
            throw new Error("Expected plain + bold text nodes");
          }
          staleAnchorKey = plain.getKey();
          staleFocusKey = bold.getKey();
          const selection = $createRangeSelection();
          selection.anchor.set(plain.getKey(), 3, "text");
          selection.focus.set(bold.getKey(), bold.getTextContentSize(), "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      expect(content.toString()).toBe("Hel");
      expect(staleAnchorKey).not.toBeNull();
      expect(staleFocusKey).not.toBeNull();

      // Detached keys that createBinding will not scrub (not in forward[]).
      (
        manager.binding.reverse as Map<string, typeof liveText>
      ).set(staleAnchorKey!, liveText);
      (
        manager.binding.reverse as Map<string, typeof liveText>
      ).set(staleFocusKey!, liveText);

      vi.advanceTimersByTime(1000);

      expect(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello world");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          return {
            text: $getRoot().getTextContent(),
            anchor: {
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focus: {
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        text: "Hello world",
        anchor: { offset: 3, type: "text" },
        focus: { offset: 5, type: "text" },
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("undo restores a range selection after deleting inside a bold span", async () => {
      // Uniform bold LiveText — same left-edge decode remap as plain text,
      // but the TextNode carries formatting. Select "orl" in "world", delete,
      // undo → selection should land back on offsets 1–4 of the bold node.
      const { room, document, content } = await createRoomWithFormattedText([
        ["world", { bold: true }],
      ]);
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration } = createCollaborationFromDocument(
        room,
        document
      );

      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected bold text node");
          }
          expect(text.hasFormat("bold")).toBe(true);
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 1, "text");
          selection.focus.set(text.getKey(), 4, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      expect(content.toString()).toBe("wd");
      vi.advanceTimersByTime(1000);

      let decodeAtUndo: number | null = null;
      const unsub = room[kInternal].history.subscribe((event) => {
        if (event.action !== "undo") return;
        const restore = collaboration.history.pendingRestore;
        if (restore === null) return;
        decodeAtUndo = content[kInternal].decodeIndex(
          restore.storage.anchor.offset,
          restore.storage.anchor.version
        );
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      unsub();
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("world");
      // Storage decode still remaps the left edge (1 → 4); Lexical snapshot
      // must win when the bold TextNode key survives (single-segment path).
      expect(decodeAtUndo).toBe(4);
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            return null;
          }
          return {
            bold: text.hasFormat("bold"),
            anchorMatches: selection.anchor.key === text.getKey(),
            focusMatches: selection.focus.key === text.getKey(),
            anchor: selection.anchor.offset,
            focus: selection.focus.offset,
            isCollapsed: selection.isCollapsed(),
          };
        })
      ).toEqual({
        bold: true,
        anchorMatches: true,
        focusMatches: true,
        anchor: 1,
        focus: 4,
        isCollapsed: false,
      });

      collaboration.unregister();
    });

    test("undo restores selection after deleting only the bold sibling", async () => {
      // Delete the entire bold sibling while leaving plain text. Undo must
      // re-select "world". Flat offset 6 is the plain|bold boundary — decode
      // may land at end of plain or start of bold; both select the same text.
      const { room, document, content } = await createRoomWithFormattedText([
        ["Hello "],
        ["world", { bold: true }],
      ]);
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const { editor, collaboration, manager } =
        createCollaborationFromDocument(room, document);

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          const bold = paragraph.getLastChild();
          if (bold === null || !$isTextNode(bold)) {
            throw new Error("Expected bold text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(bold.getKey(), 0, "text");
          selection.focus.set(bold.getKey(), bold.getTextContentSize(), "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            throw new Error("Expected range selection");
          }
          selection.removeText();
        },
        { discrete: true }
      );

      expect(content.toString()).toBe("Hello ");
      vi.advanceTimersByTime(1000);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(content.toString()).toBe("Hello world");
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          return {
            segments: paragraph.getChildren().map((node) => {
              if (!$isTextNode(node)) return null;
              return {
                text: node.getTextContent(),
                bold: node.hasFormat("bold"),
              };
            }),
            selectedText: selection.getTextContent(),
            isCollapsed: selection.isCollapsed(),
            local: {
              anchor: manager.$encodeLocalPoint(selection.anchor)?.offset,
              focus: manager.$encodeLocalPoint(selection.focus)?.offset,
            },
          };
        })
      ).toEqual({
        segments: [
          { text: "Hello ", bold: false },
          { text: "world", bold: true },
        ],
        selectedText: "world",
        isCollapsed: false,
        local: { anchor: 6, focus: 11 },
      });

      collaboration.unregister();
    });
  });

  describe("decorator nodes", () => {
    test("undo/redo insert and remove of a decorator child", async () => {
      const { room, document } = await createRoomWithText("Hi");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hi", [CustomDecoratorNode]);
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      const paragraph_liveblocks = document.get("children").get(0) as LiveElementNode;

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.append(
            $createCustomDecoratorNode({
              src: "https://example.com/a.png",
              altText: "A",
            })
          );
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(paragraph_liveblocks.get("children").length).toBe(2);
      expect(paragraph_liveblocks.get("children").get(1)!.get("kind")).toBe(
        "decorator"
      );

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(paragraph_liveblocks.get("children").length).toBe(1);
      expect(
        editor.read(() =>
          ($getRoot().getFirstChild() as ParagraphNode).getChildrenSize()
        )
      ).toBe(1);

      editor.dispatchCommand(REDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(paragraph_liveblocks.get("children").length).toBe(2);
      expect(paragraph_liveblocks.get("children").get(1)!.get("kind")).toBe(
        "decorator"
      );
      expect(
        (paragraph_liveblocks.get("children").get(1)! as LiveDecoratorNode)
          .get("props")
          ?.toJSON()
      ).toEqual({
        src: "https://example.com/a.png",
        altText: "A",
      });

      collaboration.unregister();
    });

    test("undo restores the caret from before a decorator insert", async () => {
      const { room, document } = await createRoomWithText("Hi");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("Hi", [CustomDecoratorNode]);
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 2, "text");
          selection.focus.set(text.getKey(), 2, "text");
          $setSelection(selection);
        },
        { discrete: true }
      );

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ParagraphNode;
          paragraph.append(
            $createCustomDecoratorNode({
              src: "https://example.com/a.png",
              altText: "A",
            })
          );
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect((document.get("children").get(0) as LiveElementNode).get("children").length).toBe(2);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect((document.get("children").get(0) as LiveElementNode).get("children").length).toBe(1);
      expect(
        editor.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return null;
          }
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          return {
            offset: selection.anchor.offset,
            collapsed: selection.isCollapsed(),
            type: selection.anchor.type,
            onText: text !== null && selection.anchor.key === text.getKey(),
          };
        })
      ).toEqual({
        offset: 2,
        collapsed: true,
        type: "text",
        onText: true,
      });

      collaboration.unregister();
    });

    test("undo/redo decorator prop changes", async () => {
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
            children: new LiveList([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "decorator",
                    type: "custom-decorator",
                    version: 1,
                    props: new LiveMap([
                      ["src", "https://example.com/a.png"],
                      ["altText", "A"],
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      const document = root.get("document") as LiveRootNode;
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("", [CustomDecoratorNode]);
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      const decorator_liveblocks = (document
        .get("children")
        .get(0) as LiveElementNode)
        .get("children")
        .get(0)! as LiveDecoratorNode;

      editor.update(
        () => {
          const decorator = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild() as CustomDecoratorNode;
          const writable = decorator.getWritable();
          writable.__src = "https://example.com/b.png";
          writable.__altText = "B";
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      expect(decorator_liveblocks.get("props")?.toJSON()).toEqual({
        src: "https://example.com/b.png",
        altText: "B",
      });

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(decorator_liveblocks.get("props")?.toJSON()).toEqual({
        src: "https://example.com/a.png",
        altText: "A",
      });
      expect(
        editor.read(() => {
          const decorator = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild() as CustomDecoratorNode;
          return $getLexicalNodeProps(decorator);
        })
      ).toEqual({
        src: "https://example.com/a.png",
        altText: "A",
      });

      collaboration.unregister();
    });
  });

  describe("inline element undo with formatted text", () => {
    test("undo mark next to bold does not duplicate trailing text in Lexical", async () => {
      const { room, document } = await createRoomWithText("How are you?");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("How are you?", [InlineMarkNode]);
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      // Bold "are" → multi-segment LiveText under one storage child.
      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 4, "text");
          selection.focus.set(text.getKey(), 7, "text");
          $setSelection(selection);
          selection.formatText("bold");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      // Mark plain suffix " you" next to the bold span (leaves trailing "?").
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild();
          if (!$isParagraphNode(paragraph)) {
            throw new Error("Expected paragraph");
          }
          const suffix = paragraph
            .getChildren()
            .find((child) => $isTextNode(child) && child.getTextContent() === " you?");
          if (suffix === undefined || !$isTextNode(suffix)) {
            throw new Error("Expected suffix text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(suffix.getKey(), 0, "text");
          selection.focus.set(suffix.getKey(), 4, "text");
          $setSelection(selection);
          $wrapSelectionInInlineMark();
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      const paragraph_liveblocks = document
        .get("children")
        .get(0) as LiveElementNode;
      expect(paragraph_liveblocks.get("children").length).toBeGreaterThan(1);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(
        paragraph_liveblocks.get("children").map((child) => ({
          kind: child.get("kind"),
          content:
            child.get("kind") === "text"
              ? (child as LiveTextNode).get("content").toJSON()
              : undefined,
        }))
      ).toEqual([
        {
          kind: "text",
          content: [
            ["How "],
            ["are", { bold: true }],
            [" you?"],
          ],
        },
      ]);

      expect(
        editor.read(() => {
          const paragraph = $getRoot().getFirstChild();
          if (!$isParagraphNode(paragraph)) {
            throw new Error("Expected paragraph");
          }
          return {
            text: paragraph.getTextContent(),
            hasMark: paragraph
              .getChildren()
              .some((child) => $isInlineMarkNode(child)),
          };
        })
      ).toEqual({
        text: "How are you?",
        hasMark: false,
      });

      collaboration.unregister();
    });

    test("undo mark wrapping the bold span restores formatted text", async () => {
      const { room, document } = await createRoomWithText("How are you?");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      const editor = createEditor("How are you?", [InlineMarkNode]);
      const collaboration = new LiveblocksCollaboration(editor, room, document);
      editor.update(() => {}, { discrete: true });
      collaboration.register();

      editor.update(
        () => {
          const text = (
            $getRoot().getFirstChild() as ParagraphNode
          ).getFirstChild();
          if (text === null || !$isTextNode(text)) {
            throw new Error("Expected text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(text.getKey(), 4, "text");
          selection.focus.set(text.getKey(), 7, "text");
          $setSelection(selection);
          selection.formatText("bold");
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild();
          if (!$isParagraphNode(paragraph)) {
            throw new Error("Expected paragraph");
          }
          const bold = paragraph
            .getChildren()
            .find((child) => $isTextNode(child) && child.hasFormat("bold"));
          if (bold === undefined || !$isTextNode(bold)) {
            throw new Error("Expected bold text node");
          }
          const selection = $createRangeSelection();
          selection.anchor.set(bold.getKey(), 0, "text");
          selection.focus.set(bold.getKey(), bold.getTextContentSize(), "text");
          $setSelection(selection);
          $wrapSelectionInInlineMark();
        },
        { discrete: true }
      );
      vi.advanceTimersByTime(1000);

      editor.dispatchCommand(UNDO_COMMAND, undefined);
      await Promise.resolve();
      await Promise.resolve();

      expect(
        editor.read(() => {
          const paragraph = $getRoot().getFirstChild();
          if (!$isParagraphNode(paragraph)) {
            throw new Error("Expected paragraph");
          }
          return {
            text: paragraph.getTextContent(),
            hasMark: paragraph
              .getChildren()
              .some((child) => $isInlineMarkNode(child)),
            spans: paragraph.getChildren().map((child) => ({
              type: child.getType(),
              text: child.getTextContent(),
              bold: $isTextNode(child) ? child.hasFormat("bold") : false,
            })),
          };
        })
      ).toEqual({
        text: "How are you?",
        hasMark: false,
        spans: [
          { type: "text", text: "How ", bold: false },
          { type: "text", text: "are", bold: true },
          { type: "text", text: " you?", bold: false },
        ],
      });

      collaboration.unregister();
    });
  });
});

type SerializedInlineMarkNode = Spread<
  { type: "inline-mark"; ids: string[] },
  SerializedElementNode
>;

/** Minimal MarkNode stand-in — inline element that splits paragraph children. */
class InlineMarkNode extends ElementNode {
  __ids: string[];

  static getType(): string {
    return "inline-mark";
  }

  static clone(node: InlineMarkNode): InlineMarkNode {
    return new InlineMarkNode(node.__ids, node.__key);
  }

  constructor(ids: string[] = ["mark"], key?: NodeKey) {
    super(key);
    this.__ids = ids;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("mark");
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): true {
    return true;
  }

  exportJSON(): SerializedInlineMarkNode {
    return {
      ...super.exportJSON(),
      type: "inline-mark",
      ids: this.__ids,
    };
  }

  static importJSON(serialized: SerializedInlineMarkNode): InlineMarkNode {
    return $createInlineMarkNode(serialized.ids);
  }
}

function $createInlineMarkNode(ids: string[] = ["mark"]): InlineMarkNode {
  return $applyNodeReplacement(new InlineMarkNode(ids));
}

function $isInlineMarkNode(
  node: LexicalNode | null | undefined
): node is InlineMarkNode {
  return node instanceof InlineMarkNode;
}

function $wrapSelectionInInlineMark(): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    throw new Error("Expected non-collapsed range selection");
  }
  const nodes = selection.extract();
  if (nodes.length === 0) {
    throw new Error("Expected extracted nodes");
  }
  const mark = $createInlineMarkNode();
  nodes[0]!.insertBefore(mark);
  for (const node of nodes) {
    mark.append(node);
  }
}

type SerializedCustomDecoratorNode = Spread<
  {
    src: string;
    altText: string;
  },
  SerializedLexicalNode
>;

class CustomDecoratorNode extends DecoratorNode<null> {
  __src: string;
  __altText: string;

  static getType(): string {
    return "custom-decorator";
  }

  static clone(node: CustomDecoratorNode): CustomDecoratorNode {
    return new CustomDecoratorNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(
    serializedNode: SerializedCustomDecoratorNode
  ): CustomDecoratorNode {
    return $createCustomDecoratorNode().updateFromJSON(serializedNode);
  }

  constructor(src = "", altText = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  exportJSON(): SerializedCustomDecoratorNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      altText: this.__altText,
    };
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedCustomDecoratorNode>
  ): this {
    const node = super.updateFromJSON(serializedNode);
    const writable = node.getWritable();
    if (serializedNode.src !== undefined) {
      writable.__src = serializedNode.src;
    }
    if (serializedNode.altText !== undefined) {
      writable.__altText = serializedNode.altText;
    }
    return writable;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement("span");
  }

  updateDOM(): false {
    return false;
  }

  decorate(): null {
    return null;
  }
}

function $createCustomDecoratorNode({
  src = "",
  altText = "",
}: {
  src?: string;
  altText?: string;
} = {}): CustomDecoratorNode {
  return $applyNodeReplacement(new CustomDecoratorNode(src, altText));
}

async function createTwoParagraphRoom() {
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
                content: new LiveText("First"),
              }),
            ]),
          }),
          new LiveObject({
            kind: "element",
            type: "paragraph",
            version: 1,
            children: new LiveList<LiveTextNode>([
              new LiveObject({
                kind: "text",
                type: "text",
                version: 1,
                content: new LiveText("Second"),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  const document = root.get("document") as LiveRootNode;
  return { room, document };
}

function createCollaborationFromDocument(
  room: Room,
  document: LiveRootNode
): {
  editor: LexicalEditor;
  collaboration: LiveblocksCollaboration;
  manager: LiveblocksCollaborationManager;
} {
  const editor = createLexicalEditor({
    namespace: "history-selection-test",
    nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode],
  });

  // Mirror storage into Lexical, including LiveText format segments so mixed
  // bold/plain spans bind as sibling TextNodes under one LiveText child.
  editor.update(
    () => {
      for (const child of document.get("children")) {
        const paragraph = $createParagraphNode();
        for (const grandchild of (child as LiveElementNode).get("children")) {
          if (grandchild.get("kind") === "text") {
            paragraph.append(
              ...$createTextNodesFromLiveText(
                (grandchild as LiveTextNode).get("content")
              )
            );
          }
        }
        $getRoot().append(paragraph);
      }
    },
    { discrete: true }
  );

  const collaboration = new LiveblocksCollaboration(editor, room, document);
  editor.update(() => {}, { discrete: true });
  collaboration.register();

  return {
    editor,
    collaboration,
    manager: collaboration.manager,
  };
}

function $createTextNodesFromLiveText(content: LiveText): TextNode[] {
  return content.toJSON().map((segment) => {
    const node = $createTextNode(segment[0]);
    const attributes = segment.length > 1 ? segment[1] : undefined;
    if (attributes?.bold === true) {
      node.toggleFormat("bold");
    }
    if (attributes?.italic === true) {
      node.toggleFormat("italic");
    }
    if (attributes?.underline === true) {
      node.toggleFormat("underline");
    }
    if (attributes?.strikethrough === true) {
      node.toggleFormat("strikethrough");
    }
    if (attributes?.code === true) {
      node.toggleFormat("code");
    }
    return node;
  });
}

async function createRoomWithFormattedText(
  segments: ConstructorParameters<typeof LiveText>[0]
) {
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
                content: new LiveText(segments),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  const document = root.get("document") as LiveRootNode;
  const content = (
    (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
  ).get("content");

  return { room, document, content };
}

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
    (document.get("children").get(0) as LiveElementNode).get("children").get(0)! as LiveTextNode
  ).get("content");

  return { room, document, content };
}

function createEditor(
  text: string = "Hello",
  extraNodes: Array<Klass<LexicalNode>> = []
): LexicalEditor {
  const editor = createLexicalEditor({
    namespace: "history-test",
    nodes: [ParagraphNode, TextNode, HeadingNode, QuoteNode, ...extraNodes],
  });
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true }
  );
  return editor;
}
