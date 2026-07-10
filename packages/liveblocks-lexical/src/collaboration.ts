import type { Room } from "@liveblocks/client";
import { kStorageUpdateSource } from "@liveblocks/core";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  type LexicalEditor,
} from "lexical";

import { LiveblocksHistory } from "./history";
import { LiveblocksCollaborationManager } from "./manager";
import type { LiveLexicalSelection, LiveRootNode } from "./types";

export class LiveblocksCollaboration {
  readonly editor: LexicalEditor;
  readonly room: Room;
  readonly root: LiveRootNode;
  readonly manager: LiveblocksCollaborationManager;
  readonly history: LiveblocksHistory;

  #unregister: (() => void) | null = null;

  constructor(editor: LexicalEditor, room: Room, root: LiveRootNode) {
    this.editor = editor;
    this.room = room;
    this.root = root;
    this.manager = new LiveblocksCollaborationManager(root, editor);
    this.history = new LiveblocksHistory(editor, room, this.manager);
  }

  register(): void {
    if (this.#unregister !== null) {
      return;
    }

    const { editor, room, root, manager, history } = this;

    // History first — its update listener must run before Lexical → Storage
    // so `pause()` wraps the mutations that follow.
    history.register();

    this.#unregister = mergeRegister(
      editor.registerUpdateListener(
        ({
          tags,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          editorState,
        }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
            return;
          }

          if (manager.binding.reverse.size === 0) {
            return;
          }

          try {
            editorState.read(() => {
              room.batch(() => {
                manager.$applyLocalUpdates({
                  dirtyElements: new Set(dirtyElements.keys()),
                  dirtyLeaves,
                  normalizedNodes,
                });
              });
            });
          } catch (error) {
            console.error("Failed to apply local changes to storage:", error);
          }
        }
      ),
      editor.registerUpdateListener(({ tags }) => {
        if (
          tags.has(COLLABORATION_TAG) ||
          tags.has(HISTORIC_TAG) ||
          manager.binding.reverse.size === 0
        ) {
          return;
        }

        try {
          editor.read(() => {
            room.updatePresence({ selection: manager.$encodeSelection() });
          });
        } catch (error) {
          console.error("Failed to publish selection presence:", error);
        }
      }),
      () => {
        room.updatePresence({ selection: null });
      },
      room.subscribe(
        root,
        (updates) => {
          if (manager.binding.reverse.size === 0) {
            return;
          }

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

          try {
            editor.update(
              () => {
                manager.$applyRemoteUpdates(updates);

                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                  return;
                }

                if (isFromHistory) {
                  const restore = history.pendingRestore;
                  history.pendingRestore = null;
                  if (restore === null) {
                    return;
                  }

                  // Prefer Lexical snapshot when that node key is still bound —
                  // storage decode of a surviving LiveText can collapse offsets
                  // after delete/undo. When keys were recreated (common with
                  // multi-segment formatted text), use local flat offsets so
                  // we skip the remapping decodeIndex path. Presence storage
                  // decode remains last-resort.
                  const anchor = manager.binding.reverse.has(
                    restore.lexical.anchor.key
                  )
                    ? restore.lexical.anchor
                    : (manager.$decodeLocalPoint(restore.local.anchor) ??
                      manager.$decodePoint(restore.storage.anchor));
                  const focus = manager.binding.reverse.has(
                    restore.lexical.focus.key
                  )
                    ? restore.lexical.focus
                    : (manager.$decodeLocalPoint(restore.local.focus) ??
                      manager.$decodePoint(restore.storage.focus));
                  if (anchor === null || focus === null) {
                    return;
                  }

                  selection.anchor.set(anchor.key, anchor.offset, anchor.type);
                  selection.focus.set(focus.key, focus.offset, focus.type);
                  return;
                }

                const selection_presence = room.getPresence().selection as
                  | LiveLexicalSelection
                  | null
                  | undefined;
                if (
                  selection_presence === null ||
                  selection_presence === undefined
                ) {
                  return;
                }

                const decoded = manager.$decodeSelection(selection_presence);
                if (decoded === null) {
                  return;
                }

                selection.anchor.set(
                  decoded.anchor.key,
                  decoded.anchor.offset,
                  decoded.anchor.type
                );
                selection.focus.set(
                  decoded.focus.key,
                  decoded.focus.offset,
                  decoded.focus.type
                );
              },
              {
                // Do not pass `discrete: true`. Nested discrete updates throw
                // inside Lexical command updates (undo/redo).
                skipTransforms: true,
                tag: isFromHistory ? HISTORIC_TAG : COLLABORATION_TAG,
                onUpdate: () => {
                  editor.read(() => {
                    if (isFromHistory) {
                      const storage = manager.$encodeSelection();
                      const selection = $getSelection();
                      if (storage !== null && $isRangeSelection(selection)) {
                        const localAnchor = manager.$encodeLocalPoint(
                          selection.anchor
                        );
                        const localFocus = manager.$encodeLocalPoint(
                          selection.focus
                        );
                        if (localAnchor === null || localFocus === null) {
                          history.pendingBefore = null;
                        } else {
                          history.pendingBefore = {
                            storage,
                            local: {
                              anchor: localAnchor,
                              focus: localFocus,
                            },
                            lexical: {
                              anchor: {
                                key: selection.anchor.key,
                                offset: selection.anchor.offset,
                                type: selection.anchor.type,
                              },
                              focus: {
                                key: selection.focus.key,
                                offset: selection.focus.offset,
                                type: selection.focus.type,
                              },
                            },
                          };
                        }
                      } else {
                        history.pendingBefore = null;
                      }
                    }
                    room.updatePresence({
                      selection: manager.$encodeSelection(),
                    });
                  });
                },
              }
            );
          } catch (error) {
            console.error("Failed to apply remote changes to editor:", error);
          }
        },
        { isDeep: true }
      ),
      () => {
        history.unregister();
      }
    );
  }

  unregister(): void {
    this.#unregister?.();
    this.#unregister = null;
  }
}
