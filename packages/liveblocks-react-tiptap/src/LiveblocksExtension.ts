import { kInternal, TextEditorType } from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useEffect } from "react";
import { Doc } from "yjs";

import { CommentsExtension } from "./comments/CommentsExtension";
import { MentionExtension } from "./mentions/MentionExtension";

const providersMap = new Map<
  string,
  LiveblocksYjsProvider<any, any, any, any, any>
>();

const docMap = new Map<string, Doc>();

type LiveblocksExtensionOptions = {
  field?: string;
};

const LiveblocksCollab = Collaboration.extend({
  // Override the onCreate method to warn users about potential misconfigurations
  onCreate() {
    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "doc")
    ) {
      console.warn(
        "[Liveblocks] The tiptap document extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      !this.editor.extensionManager.extensions.find(
        (e) => e.name === "paragraph"
      )
    ) {
      console.warn(
        "[Liveblocks] The tiptap paragraph extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }

    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "text")
    ) {
      console.warn(
        "[Liveblocks] The tiptap text extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      this.editor.extensionManager.extensions.find((e) => e.name === "history")
    ) {
      console.warn(
        "[Liveblocks] The history extension is enabled, Liveblocks extension provides its own. Please remove or disable the History plugin to prevent unwanted conflicts."
      );
    }
  },
});

// TODO: move options to `addOptions` of the extension itself
// TODO: add option to disable mentions
// TODO: add option to disable comments
export const useLiveblocksExtension = ({
  field,
}: LiveblocksExtensionOptions = {}): Extension => {
  const room = useRoom();
  useEffect(() => {
    // Report that this is lexical and root is the rootKey
    room[kInternal].reportTextEditor(TextEditorType.TipTap, "root");
  }, [room]);
  return Extension.create({
    name: "liveblocksExtension",

    onCreate() {
      if (
        this.editor.extensionManager.extensions.find(
          (e) => e.name.toLowerCase() === "mention"
        )
      ) {
        console.warn(
          "[Liveblocks] Liveblocks contains its own mention plugin, using another mention plugin may cause a conflict."
        );
      }
      const self = room.getSelf();
      if (self?.info) {
        this.editor.commands.updateUser({
          name: self.info.name,
          color: self.info.color,
        });
      }
      this.storage.unsub = room.events.self.subscribe(({ info }) => {
        if (!info) {
          return;
        }
        const { name, color } = info;
        const { user } = this.storage.provider.awareness.getLocalState();
        // TODO: maybe we need a deep compare here so other info can be provided
        if (name != user?.name || color != user?.color) {
          this.editor.commands.updateUser({ name, color });
        }
      });
    },
    onDestroy() {
      this.storage.unsub();
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(room.id, new LiveblocksYjsProvider(room as any, doc));
      }
      return {
        doc: docMap.get(room.id),
        provider: providersMap.get(room.id),
        unsub: () => {},
      };
    },
    addExtensions() {
      const options = field !== undefined ? { field } : {};
      return [
        LiveblocksCollab.configure({
          document: this.storage.doc,
          ...options,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
        CommentsExtension,
        MentionExtension,
      ];
    },
  });
};
