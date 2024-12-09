import { type IUserInfo, kInternal, TextEditorType } from "@liveblocks/core";
import {
  useClient,
  useCommentsErrorListener,
  useRoom,
} from "@liveblocks/react";
import {
  CreateThreadError,
  getUmbrellaStoreForClient,
  useReportTextEditor,
} from "@liveblocks/react/_private";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { AnyExtension, Content, Editor } from "@tiptap/core";
import { Extension, getMarkType } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { Mark as PMMark } from "@tiptap/pm/model";
import { useCallback, useEffect, useState } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";
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
  comments?: boolean; // | CommentsConfiguration
  mentions?: boolean; // | MentionsConfiguration
  offlineSupport_experimental?: boolean;
  initialContent?: Content;
};

const DEFAULT_OPTIONS = {
  field: "default",
  comments: true,
  mentions: true,
  offlineSupport_experimental: false,
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

function useYjsProvider() {
  const room = useRoom();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return room[kInternal].yjsProviderDidChange.subscribe(onStoreChange);
    },
    [room]
  );

  const getSnapshot = useCallback(() => {
    return room[kInternal].getYjsProvider();
  }, [room]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Returns whether the editor has loaded the initial text contents from the
 * server and is ready to be used.
 */
export function useIsEditorReady(): boolean {
  const yjsProvider = useYjsProvider();

  const getSnapshot = useCallback(() => {
    const status = yjsProvider?.getStatus();
    return status === "synchronizing" || status === "synchronized";
  }, [yjsProvider]);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (yjsProvider === undefined) return () => {};
      yjsProvider.on("status", callback);
      return () => {
        yjsProvider.off("status", callback);
      };
    },
    [yjsProvider]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useLiveblocksExtension = (
  opts?: LiveblocksExtensionOptions
): Extension => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };
  const [editor, setEditor] = useState<Editor | null>(null);
  const room = useRoom();

  // TODO: we don't need these things if comments isn't turned on...
  // TODO: we don't have a reference to the editor here, need to figure this out
  useCommentsErrorListener((error) => {
    // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
    if (error instanceof CreateThreadError) {
      // handleThreadDelete(error.context.threadId);
    }
  });
  const isEditorReady = useIsEditorReady();
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);
  const roomId = room.id;
  const yjsProvider = useYjsProvider();

  // If the user provided initialContent, wait for ready and then set it
  useEffect(() => {
    if (!isEditorReady || !yjsProvider || !options.initialContent || !editor)
      return;

    // As noted in the tiptap documentation, you may not set initial content with collaboration.
    // The docs provide the following workaround:
    const ydoc = (yjsProvider as LiveblocksYjsProvider).getYDoc();
    const hasContentSet = ydoc.getMap("liveblocks_config").get("hasContentSet");
    if (!hasContentSet) {
      ydoc.getMap("liveblocks_config").set("hasContentSet", true);
      editor.commands.setContent(options.initialContent);
    }
  }, [isEditorReady, yjsProvider, options.initialContent, editor]);

  useReportTextEditor(
    TextEditorType.TipTap,
    options.field ?? DEFAULT_OPTIONS.field
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
    never,
    {
      unsubs: (() => void)[];
      doc: Doc;
      provider: LiveblocksYjsProvider<any, any, any, any, any>;
    }
  >({
    name: "liveblocksExtension",

    onCreate() {
      setEditor(this.editor);
      if (this.editor.options.content) {
        console.warn(
          "[Liveblocks] Initial content must be set in the useLiveblocksExtension hook option. Remove content from your editor options."
        );
      }
      if (
        options.mentions &&
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
      if (options.comments) {
        const commentMarkType = getMarkType(
          LIVEBLOCKS_COMMENT_MARK_TYPE,
          this.editor.schema
        );
        this.storage.unsubs.push(
          // Subscribe to threads so we can update comment marks if they become resolved/deleted
          store.subscribe(() => {
            const threadMap = new Map(
              store
                .getFullState()
                .threadsDB.findMany(roomId, { resolved: false }, "asc")
                .map((thread) => [thread.id, true])
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
    },
    onDestroy() {
      this.storage.unsubs.forEach((unsub) => unsub());
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(
          room.id,
          new LiveblocksYjsProvider(room, doc, {
            offlineSupport_experimental: options.offlineSupport_experimental,
          })
        );
      }
      return {
        doc: docMap.get(room.id)!,
        provider: providersMap.get(room.id)!,
        unsubs: [],
      };
    },
    addExtensions() {
      const extensions: AnyExtension[] = [
        LiveblocksCollab.configure({
          document: this.storage.doc,
          field: options.field,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
      ];

      if (options.comments) {
        extensions.push(CommentsExtension);
      }
      if (options.mentions) {
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
