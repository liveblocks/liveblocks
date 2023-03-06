import type { Room, StorageUpdate } from "@liveblocks/client";
import { Descendant, Editor } from "slate";
import { applyStorageUpdates } from "../../applyToEditor";
import { applySlateOperation } from "../../applyToLiveRoot";
import type { LiveRoot } from "../../types";
import { LiveblocksEditor, LiveblocksRequiredEditor } from "./liveblocksEditor";
import type { PendingChange } from "./types";
import { EDITOR_TO_PENDING_CHANGES, EDITOR_TO_UNSUBSCRIBE } from "./weakMaps";

export type CreateWithLiveblocksOptions<TRoom extends Room<{}, {}, {}, {}>> = {
  room: TRoom;
  liveRoot: LiveRoot;
};

export function createWithLiveblocks<TRoom extends Room<{}, {}, {}, {}>>({
  room,
  liveRoot,
}: CreateWithLiveblocksOptions<TRoom>) {
  return function withLiveblocks<T extends LiveblocksRequiredEditor>(
    editor: T
  ): T & LiveblocksEditor<TRoom> {
    if (room.id !== liveRoot.roomId) {
      throw new Error(`LiveRoot isn't part provided room (${room.id})`);
    }

    const e = editor as T & LiveblocksEditor<TRoom>;

    // TODO: Attach room and liveRoot via WeakMap?
    // Define liveRoot and room properties on the editor as non-enumerable so slate
    // doesn't throw while serializing it for errors.
    Object.defineProperty(e, "room", {
      enumerable: false,
      value: room,
    });
    Object.defineProperty(e, "liveRoot", {
      enumerable: false,
      value: liveRoot,
    });

    e.handleRemoteChange = (updates: StorageUpdate[]) => {
      if (LiveblocksEditor.isLocal(e)) {
        return;
      }

      if (LiveblocksEditor.localChanges(e).length) {
        e.flushLocalChanges();
      }

      Editor.withoutNormalizing(e, () => {
        LiveblocksEditor.asRemote(e, () => {
          applyStorageUpdates(e, updates);
        });
      });
    };

    e.storeLocalChange = (op) => {
      EDITOR_TO_PENDING_CHANGES.set(e, [
        ...LiveblocksEditor.localChanges(e),
        op,
      ]);
    };

    e.flushLocalChanges = () => {
      const changes = LiveblocksEditor.localChanges(e);
      if (!changes.length) {
        return;
      }

      EDITOR_TO_PENDING_CHANGES.set(e, []);
      LiveblocksEditor.asLocal(e, () => {
        e.room.batch(() => {
          changes.forEach((change) => {
            e.submitLocalChange(change);
          });
        });
      });
    };

    e.submitLocalChange = (change: PendingChange) => {
      applySlateOperation(e.liveRoot, change.op);
    };

    e.setChildren = (children) => {
      e.children = children;

      Editor.normalize(e, { force: true });

      if (!editor.operations.length) {
        editor.onChange();
      }
    };

    e.connect = async () => {
      if (LiveblocksEditor.isConnected(e)) {
        throw new Error("Already connected");
      }

      const unsubscribe = e.room.subscribe(liveRoot, e.handleRemoteChange, {
        isDeep: true,
      });
      EDITOR_TO_UNSUBSCRIBE.set(e, unsubscribe);

      e.setChildren(e.liveRoot.toImmutable() as Descendant[]);
    };

    e.disconnect = () => {
      const unsubscribe = EDITOR_TO_UNSUBSCRIBE.get(e);
      if (!unsubscribe) {
        throw new Error("Not connected");
      }

      unsubscribe();
      EDITOR_TO_UNSUBSCRIBE.delete(e);
    };

    const { apply } = editor;
    e.apply = (op) => {
      if (!LiveblocksEditor.isRemote(e)) {
        e.storeLocalChange({ op });
      }

      apply(op);
    };

    const { onChange } = editor;
    e.onChange = () => {
      e.flushLocalChanges();
      onChange();
    };

    return e;
  };
}
