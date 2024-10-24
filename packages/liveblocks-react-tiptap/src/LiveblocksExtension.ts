import { type IUserInfo, kInternal, TextEditorType } from "@liveblocks/core";
import {
  CreateThreadError,
  getUmbrellaStoreForClient,
  selectThreads,
  useClient,
  useCommentsErrorListener,
  useRoom,
} from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { AnyExtension } from "@tiptap/core";
import { Extension, getMarkType } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { Mark as PMMark } from "@tiptap/pm/model";
import { useCallback } from "react";
import { Doc } from "yjs";

import { CommentsExtension } from "./comments/CommentsExtension";
import { MentionExtension } from "./mentions/MentionExtension";
import { LIVEBLOCKS_COMMENT_MARK_TYPE } from "./types";

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

  // TODO: we don't need these things if comments isn't turned on...
  // TODO: we don't have a reference to the editor here, need to figure this out
  useCommentsErrorListener((error) => {
    // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
    if (error instanceof CreateThreadError) {
      // handleThreadDelete(error.context.threadId);
    }
  });
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);
  const roomId = room.id;

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
      unsubs: (() => void)[];
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
      this.storage.unsubs.push(
        room.events.self.subscribe(({ info }) => {
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
        })
      );
      if (this.options.comments) {
        const commentMarkType = getMarkType(
          LIVEBLOCKS_COMMENT_MARK_TYPE,
          this.editor.schema
        );
        this.storage.unsubs.push(
          // Subscribe to threads so we can update comment marks if they become resolved/deleted
          store.subscribeThreads(() => {
            const threadMap = new Map(
              selectThreads(store.getFullState(), {
                roomId,
                orderBy: "age",
                query: {
                  resolved: false,
                },
              }).map((thread) => [thread.id, true])
            );
            function isComment(mark: PMMark): mark is PMMark & {
              attrs: { orphan: boolean; threadId: string };
            } {
              return mark.type.name === LIVEBLOCKS_COMMENT_MARK_TYPE;
            }
            // when threads change, find marks and update them if needed
            this.editor.state.doc.descendants((node, pos) => {
              node.marks.forEach((mark) => {
                if (isComment(mark)) {
                  const markThreadId = mark.attrs.threadId;
                  const isOrphan = !threadMap.has(markThreadId);
                  if (isOrphan !== mark.attrs.orphan) {
                    const { tr } = this.editor.state;
                    const trimmedFrom = Math.max(pos, 0);
                    const trimmedTo = Math.min(
                      pos + node.nodeSize,
                      this.editor.state.doc.content.size - 1
                    );
                    tr.removeMark(trimmedFrom, trimmedTo, commentMarkType);
                    tr.addMark(
                      trimmedFrom,
                      trimmedTo,
                      commentMarkType.create({
                        ...mark.attrs,
                        orphan: isOrphan,
                      })
                    );
                    this.editor.view.dispatch(tr);
                  }
                }
              });
            });
          })
        );
      }

      reportTextEditorType(this.options.field ?? "default");
    },
    onDestroy() {
      this.storage.unsubs.forEach((unsub) => unsub());
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
        unsubs: [],
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
