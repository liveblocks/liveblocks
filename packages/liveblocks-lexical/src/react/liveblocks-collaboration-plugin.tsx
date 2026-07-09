import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Room } from "@liveblocks/client";
import { kStorageUpdateSource } from "@liveblocks/core";
import { $getSelection, $isRangeSelection, COLLABORATION_TAG } from "lexical";
import { useEffect, useRef } from "react";

import { LiveblocksCollaborationManager } from "../manager";
import type { LiveLexicalSelection, LiveRootNode } from "../types";
import { RemoteCursorsPlugin } from "./remote-cursors";

export type LiveblocksCollaborationPluginProps = {
  room: Room;
  root: LiveRootNode;
};

/**
 * Liveblocks collaboration plugin for Lexical.
 *
 * Mount inside a `LexicalComposer` (from `@lexical/react`) after storage has
 * loaded. Wires bidirectional Lexical ↔ Storage sync, presence selection, and
 * remote cursors.
 *
 * Import `@liveblocks/lexical/styles.css` for collaboration cursor styles.
 */
export function LiveblocksCollaborationPlugin({
  room,
  root,
}: LiveblocksCollaborationPluginProps) {
  const [editor] = useLexicalComposerContext();
  const _manager = useRef<LiveblocksCollaborationManager | null>(null);

  if (_manager.current === null) {
    _manager.current = new LiveblocksCollaborationManager(root, editor);
  }
  const manager = _manager.current;

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ tags, dirtyElements, dirtyLeaves, normalizedNodes, editorState }) => {
        if (tags.has(COLLABORATION_TAG)) return;

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
    );
  }, [editor, room, manager]);

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      if (tags.has(COLLABORATION_TAG) || manager.binding.reverse.size === 0) {
        return;
      }

      try {
        editor.read(() => {
          room.updatePresence({ selection: manager.$encodeSelection() });
        });
      } catch (error) {
        console.error("Failed to publish selection presence:", error);
      }
    });
  }, [editor, room, manager]);

  useEffect(() => {
    return () => {
      room.updatePresence({ selection: null });
    };
  }, [room]);

  useEffect(() => {
    return room.subscribe(
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

        try {
          editor.update(
            () => {
              manager.$applyRemoteUpdates(updates);

              const selection = $getSelection();
              if (!$isRangeSelection(selection)) {
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
              skipTransforms: true,
              tag: COLLABORATION_TAG,
              onUpdate: () => {
                editor.read(() => {
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
    );
  }, [editor, room, root, manager]);

  return <RemoteCursorsPlugin manager={manager} root={root} room={room} />;
}
