import { type IUserInfo, kInternal, TextEditorType } from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { AnyExtension } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCallback } from "react";
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
  comments: boolean; // | CommentsConfiguration
  mentions: boolean; // | MentionsConfiguration
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

export const useLiveblocksExtension = (): Extension => {
  const room = useRoom();

  const reportTextEditorType = useCallback(
    (field: string) => {
      room[kInternal].reportTextEditor(TextEditorType.TipTap, field);
    },
    [room]
  );
  const onCreateMention = useCallback(
    (userId: string, notificationId: string) => {
      try {
        room[kInternal].createTextMention(userId, notificationId);
      } catch (err) {
        console.warn(err);
      }
    },
    [room]
  );
  const onDeleteMention = useCallback(
    (notificationId: string) => {
      try {
        room[kInternal].deleteTextMention(notificationId);
      } catch (err) {
        console.warn(err);
      }
    },
    [room]
  );
  return Extension.create<
    LiveblocksExtensionOptions,
    {
      unsub: () => void;
      doc: Doc;
      provider: LiveblocksYjsProvider<any, any, any, any, any>;
    }
  >({
    name: "liveblocksExtension",

    onCreate() {
      if (
        this.options.mentions &&
        this.editor.extensionManager.extensions.find(
          (e) => e.name.toLowerCase() === "mention"
        )
      ) {
        console.warn(
          "[Liveblocks] Liveblocks own mention plugin is enabled, using another mention plugin may cause a conflict."
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
        const { user } = this.storage.provider.awareness.getLocalState() as {
          user: IUserInfo;
        };
        // TODO: maybe we need a deep compare here so other info can be provided
        if (name !== user?.name || color !== user?.color) {
          this.editor.commands.updateUser({ name, color });
        }
      });
      reportTextEditorType(this.options.field ?? "default");
    },
    onDestroy() {
      this.storage.unsub();
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(room.id, new LiveblocksYjsProvider(room, doc));
      }
      return {
        doc: docMap.get(room.id)!,
        provider: providersMap.get(room.id)!,
        unsub: () => {},
      };
    },

    addOptions() {
      return {
        field: "default",
        mentions: true,
        comments: true,
      };
    },
    addExtensions() {
      const extensions: AnyExtension[] = [
        LiveblocksCollab.configure({
          document: this.storage.doc,
          field: this.options.field,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
      ];

      if (this.options.comments) {
        extensions.push(CommentsExtension);
      }
      if (this.options.mentions) {
        extensions.push(
          MentionExtension.configure({
            onCreateMention,
            onDeleteMention,
          })
        );
      }

      return extensions;
    },
  });
};
