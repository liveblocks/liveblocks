import type {
  BaseUserMeta,
  IUserInfo,
  JsonObject,
  User,
} from "@liveblocks/core";
import { kInternal, TextEditorType } from "@liveblocks/core";
import { useClient, useRoom } from "@liveblocks/react";
import {
  getUmbrellaStoreForClient,
  useCreateTextMention,
  useDeleteTextMention,
  useReportTextEditor,
  useYjsProvider,
} from "@liveblocks/react/_private";
import { useInitial } from "@liveblocks/react-ui/_private";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import type { AnyExtension, Editor } from "@tiptap/core";
import { Extension, getMarkType, Mark } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor, {
  type CollaborationCaretOptions,
} from "@tiptap/extension-collaboration-caret";
import type { Mark as PMMark } from "@tiptap/pm/model";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { AiExtension } from "./ai/AiExtension";
import {
  areSetsEqual,
  CommentsExtension,
  FILTERED_THREADS_PLUGIN_KEY,
} from "./comments/CommentsExtension";
import { MentionExtension } from "./mentions/MentionExtension";
import type {
  LiveblocksExtensionOptions,
  LiveblocksExtensionStorage,
  ResolveContextualPromptArgs,
  ResolveContextualPromptResponse,
} from "./types";
import { LIVEBLOCKS_COMMENT_MARK_TYPE } from "./types";

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

const DEFAULT_OPTIONS: WithRequired<LiveblocksExtensionOptions, "field"> = {
  field: "default",
  comments: true,
  mentions: true,
  offlineSupport_experimental: false,
  enablePermanentUserData: false,
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
      this.editor.extensionManager.extensions.find((e) => e.name === "undoRedo")
    ) {
      console.warn(
        "[Liveblocks] The undoRedo extension is enabled, Liveblocks extension provides its own. Please remove or disable the undoRedo extension to prevent conflicts."
      );
    }
  },
});

/**
 * Returns whether the editor has loaded the initial text contents from the
 * server and is ready to be used.
 *
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

const YChangeMark = Mark.create({
  name: "ychange",
  inclusive: false,
  parseHTML() {
    return [{ tag: "ychange" }];
  },
  addAttributes() {
    return {
      user: {
        default: null,
        parseHTML: (element) => element.getAttribute("ychange_user") ?? null,
        renderHTML: (attributes: { user: string | null }) => {
          if (!attributes.user) {
            return {};
          }
          return { "data-ychange-user": attributes.user };
        },
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("ychange_type") ?? null,
        renderHTML: (attributes: { type: string | null }) => {
          if (!attributes.type) {
            return {};
          }
          return {
            "data-ychange-type": attributes.type,
            "data-liveblocks": "",
            class: `lb-root lb-tiptap-change lb-tiptap-change-${attributes.type}`,
          };
        },
      },
      color: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("ychange_color") ?? null;
        },
        renderHTML: () => {
          // attributes: { color: { light: string; dark: string } | null }
          return {}; // we don't need this color attribute for now
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["ychange", HTMLAttributes, 0];
  },
});

export const useLiveblocksExtension = (
  opts?: LiveblocksExtensionOptions
): Extension => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };
  const textEditorType = useInitial<TextEditorType>(
    options.textEditorType ?? TextEditorType.TipTap
  );
  const editor = useRef<Editor | null>(null);
  const room = useRoom();

  // TODO: we don't need these things if comments isn't turned on...
  // TODO: we don't have a reference to the editor here, need to figure this out
  // useErrorListener((error) => {
  //   // If thread creation fails, we remove the thread id from the associated nodes and unwrap the nodes if they are no longer associated with any threads
  //   if (
  //     error.context.type === "CREATE_THREAD_ERROR" &&
  //     error.context.roomId === room.id
  //   ) {
  //     handleThreadDelete(error.context.threadId);
  //   }
  // });

  const isEditorReady = useIsEditorReady();
  const client = useClient();
  const store = getUmbrellaStoreForClient(client);
  const roomId = room.id;
  const yjsProvider = useYjsProvider();

  // If the user provided initialContent, wait for ready and then set it
  useEffect(() => {
    if (
      !isEditorReady ||
      !yjsProvider ||
      !options.initialContent ||
      !editor.current
    )
      return;

    // As noted in the tiptap documentation, you may not set initial content with collaboration.
    // The docs provide the following workaround:
    const ydoc = (yjsProvider as LiveblocksYjsProvider).getYDoc();
    const hasContentSet = ydoc.getMap("liveblocks_config").get("hasContentSet");
    if (!hasContentSet) {
      ydoc.getMap("liveblocks_config").set("hasContentSet", true);
      editor.current.commands.setContent(options.initialContent);
    }
  }, [isEditorReady, yjsProvider, options.initialContent]);

  useReportTextEditor(textEditorType, options.field ?? DEFAULT_OPTIONS.field);

  const prevThreadsRef = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    if (!isEditorReady) return;

    if (!editor.current) return;

    const newThreads = options.threads_experimental
      ? new Set(options.threads_experimental.map((t) => t.id))
      : undefined;

    const hasFilteredThreadsChanged = !areSetsEqual(
      prevThreadsRef.current,
      newThreads
    );

    if (hasFilteredThreadsChanged) {
      prevThreadsRef.current = newThreads;
    }

    if (hasFilteredThreadsChanged) {
      editor.current.view.dispatch(
        editor.current.state.tr.setMeta(FILTERED_THREADS_PLUGIN_KEY, {
          filteredThreads: options.threads_experimental
            ? new Set(options.threads_experimental.map((t) => t.id))
            : undefined,
        })
      );
    }
  }, [isEditorReady, options.threads_experimental]);

  const createTextMention = useCreateTextMention();
  const deleteTextMention = useDeleteTextMention();

  // Tiptap has options default as any, in tiptap2, we could use never, but now we must use any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Extension.create<any, LiveblocksExtensionStorage>({
    name: "liveblocksExtension",

    onCreate() {
      editor.current = this.editor;
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
      const updateUser = ({
        info,
        id: userId,
      }: User<JsonObject, BaseUserMeta>) => {
        if (!info) {
          return;
        }
        const { user: storedUser } =
          this.storage.provider.awareness.getLocalState() as {
            user: IUserInfo;
          };
        if (this.storage.permanentUserData) {
          const pud = this.storage.permanentUserData.clients.get(
            this.storage.doc.clientID
          );
          // Only update if there is no entry or if the entry is different
          if (!pud || pud !== userId) {
            this.storage.permanentUserData.setUserMapping(
              this.storage.doc,
              this.storage.doc.clientID,
              userId ?? "Unknown" // TODO: change this to the user's ID so we can map it to the user's name
            );
          }
        }
        if (
          info.name !== storedUser?.name ||
          info.color !== storedUser?.color
        ) {
          this.editor.commands.updateUser({
            name: info.name,
            color: info.color,
          });
        }
      };
      // if we already have user info, we update the user
      if (self?.info) {
        updateUser(self);
      }
      // we also listen in case the user info changes
      this.storage.unsubs.push(room.events.self.subscribe(updateUser));
      if (options.comments) {
        const commentMarkType = getMarkType(
          LIVEBLOCKS_COMMENT_MARK_TYPE,
          this.editor.schema
        );
        this.storage.unsubs.push(
          // Subscribe to threads so we can update comment marks if they become resolved/deleted
          store.outputs.threads.subscribe(() => {
            const threadMap = new Map(
              store.outputs.threads
                .get()
                .findMany(roomId, { resolved: false }, "asc")
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
                    tr.removeMark(trimmedFrom, trimmedTo, mark);
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
    addGlobalAttributes() {
      return [
        {
          types: ["paragraph", "heading"],
          attributes: {
            ychange: { default: null },
          },
        },
      ];
    },
    addStorage() {
      const provider = getYjsProviderForRoom(room, {
        enablePermanentUserData:
          !!options.ai || options.enablePermanentUserData,
        offlineSupport_experimental: options.offlineSupport_experimental,
      });
      return {
        doc: provider.getYDoc(),
        provider,
        permanentUserData: provider.permanentUserData,
        unsubs: [],
      };
    },
    addExtensions() {
      const extensions: AnyExtension[] = [
        YChangeMark,

        LiveblocksCollab.configure({
          ySyncOptions: {
            permanentUserData: this.storage.permanentUserData,
          },
          document: this.storage.doc,
          field: options.field,
        }), // I don't really think this is needed...
        CollaborationCursor.configure({
          provider: this.storage.provider,
        }) as Extension<CollaborationCaretOptions>,
      ];

      if (options.comments) {
        extensions.push(CommentsExtension);
      }
      if (options.mentions) {
        extensions.push(
          MentionExtension.configure({
            onCreateMention: (mention) => {
              createTextMention(mention.notificationId, mention);
            },
            onDeleteMention: deleteTextMention,
          })
        );
      }
      if (options.ai) {
        const resolveContextualPrompt = async ({
          prompt,
          context,
          previous,
          signal,
        }: ResolveContextualPromptArgs): Promise<ResolveContextualPromptResponse> => {
          const result = await room[kInternal].executeContextualPrompt({
            prompt,
            context,
            previous,
            signal,
          });

          // This response is validated afterwards by AiExtension itself
          return JSON.parse(result) as ResolveContextualPromptResponse;
        };

        extensions.push(
          AiExtension.configure({
            resolveContextualPrompt,
            ...(typeof options.ai === "boolean" ? {} : options.ai),
            doc: this.storage.doc,
            pud: this.storage.permanentUserData,
          })
        );
      }

      return extensions;
    },
  });
};
