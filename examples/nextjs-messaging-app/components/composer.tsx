"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { SendHorizontal } from "lucide-react";
import { nanoid } from "nanoid";
import { AI_USER, AI_USER_ID, getUsers } from "@/app/database";
import { getMentionedUserIds, isChatMessage } from "@/lib/activity";
import type { Conversation } from "@/lib/conversations";
import { useNotifyActivity } from "@/lib/use-activity";
import { getThreadFeedId } from "@/lib/threads";
import { isMessageEmpty, serializeMarkdown } from "@/lib/serialize-markdown";
import {
  MentionSuggestions,
  type MentionItem,
  type MentionSuggestionsRef,
} from "@/components/mention-suggestions";
import { useTypingLabel } from "@/components/typing-indicator";
import "./composer.css";

function createPlaceholderExtension(placeholder: string) {
  return Extension.create({
    name: "messagePlaceholder",
    addOptions() {
      return { placeholder };
    },
    onCreate() {
      this.editor.view.dom.setAttribute(
        "data-placeholder",
        this.options.placeholder
      );
    },
    onUpdate() {
      this.editor.view.dom.setAttribute(
        "data-placeholder",
        this.options.placeholder
      );
    },
    addProseMirrorPlugins() {
      const placeholder = this.options.placeholder;

      return [
        new Plugin({
          key: new PluginKey("messagePlaceholder"),
          props: {
            decorations: ({ doc }) => {
              const firstChild = doc.firstChild;
              const isEmpty =
                doc.childCount === 1 &&
                firstChild?.type.name === "paragraph" &&
                firstChild.content.size === 0;

              if (!isEmpty || !firstChild) {
                return DecorationSet.empty;
              }

              return DecorationSet.create(doc, [
                Decoration.node(0, firstChild.nodeSize, {
                  class: "is-editor-empty",
                  "data-placeholder": placeholder,
                }),
              ]);
            },
          },
        }),
      ];
    },
  });
}

const MENTION_USERS: MentionItem[] = [
  ...getUsers().map((user) => ({
    id: user.id,
    label: user.info.name,
    avatar: user.info.avatar,
  })),
  {
    id: AI_USER.id,
    label: AI_USER.info.name,
    avatar: AI_USER.info.avatar,
  },
];

function filterMentionItems(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return MENTION_USERS;
  }

  return MENTION_USERS.filter((user) =>
    user.label.toLowerCase().includes(normalized)
  );
}

export function Composer({
  feedId,
  roomId,
  placeholder,
  history,
  onSend,
  forceAiReply = false,
  enableAiReply = true,
}: {
  feedId: string;
  roomId: string;
  placeholder: string;
  history: { userId: string; content: string }[];
  onSend: (content: string) => Promise<void>;
  forceAiReply?: boolean;
  enableAiReply?: boolean;
}) {
  const self = useSelf();
  const typingLabel = useTypingLabel(feedId);
  const updateMyPresence = useUpdateMyPresence();
  const [isEmpty, setIsEmpty] = useState(true);
  const inFlightRef = useRef(false);
  const sendMessageRef = useRef<() => Promise<void>>(async () => {});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While the mention popup is open, Enter must pick a suggestion instead of
  // sending. Direct editor props run before the suggestion plugin's handler,
  // so we track the popup state ourselves.
  const mentionPopupOpenRef = useRef(false);

  const clearTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    updateMyPresence({ typingIn: null });
  }, [updateMyPresence]);

  const scheduleTypingClear = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      updateMyPresence({ typingIn: null });
      typingTimeoutRef.current = null;
    }, 2500);
  }, [updateMyPresence]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
      }),
      createPlaceholderExtension(placeholder),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        renderText({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          items: ({ query }) => filterMentionItems(query),
          render: () => {
            let component: ReactRenderer<MentionSuggestionsRef> | null = null;
            let unmount: (() => void) | null = null;

            return {
              onStart: (props) => {
                mentionPopupOpenRef.current = true;
                component = new ReactRenderer(MentionSuggestions, {
                  props,
                  editor: props.editor,
                });
                unmount = props.mount(component.element);
              },
              onUpdate: (props) => {
                component?.updateProps(props);
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                mentionPopupOpenRef.current = false;
                unmount?.();
                component?.destroy();
                component = null;
                unmount = null;
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "composer-editor text-sm",
      },
      handleKeyDown: (_view, event) => {
        if (mentionPopupOpenRef.current) {
          return false;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void sendMessageRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setIsEmpty(isMessageEmpty(updatedEditor.getJSON()));
      updateMyPresence({ typingIn: feedId });
      scheduleTypingClear();
    },
  });

  const sendMessage = useCallback(async () => {
    if (!editor || inFlightRef.current) {
      return;
    }

    const doc = editor.getJSON();
    if (isMessageEmpty(doc)) {
      return;
    }

    const content = serializeMarkdown(doc);
    inFlightRef.current = true;
    clearTyping();

    try {
      await onSend(content);

      editor.commands.clearContent(true);
      setIsEmpty(true);

      if (
        enableAiReply &&
        (forceAiReply || content.includes(`<@${AI_USER_ID}>`))
      ) {
        const aiHistory = [...history.slice(-24), { userId: self.id, content }];

        void fetch("/api/ai-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            feedId,
            messages: aiHistory,
          }),
        });
      }
    } catch {
      // Best-effort in this demo.
    } finally {
      inFlightRef.current = false;
    }
  }, [
    clearTyping,
    editor,
    enableAiReply,
    feedId,
    forceAiReply,
    history,
    onSend,
    roomId,
    self.id,
  ]);

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, [clearTyping, feedId]);

  useEffect(() => {
    editor?.commands.focus("end");
  }, [feedId, editor]);

  return (
    <div className="shrink-0 bg-white px-5 pb-1">
      <div className="relative rounded-md border border-neutral-300 bg-white transition-all focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100/80">
        <EditorContent editor={editor} />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={isEmpty}
          className={clsx(
            "absolute bottom-1.5 right-1.5 rounded-md p-1.5 transition",
            isEmpty
              ? "cursor-not-allowed bg-neutral-100 text-neutral-400"
              : "bg-brand-600 text-white hover:bg-brand-700"
          )}
          aria-label="Send message"
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>
      <p
        className={clsx(
          "mt-1.5 truncate text-[11px] text-neutral-500",
          typingLabel && "italic"
        )}
        aria-live="polite"
      >
        {typingLabel ?? <>&nbsp;</>}
      </p>
    </div>
  );
}

export function ConversationComposer({
  conversation,
  roomId,
  onOpenThread,
}: {
  conversation: Conversation;
  roomId: string;
  onOpenThread?: (parentMessageId: string) => void;
}) {
  const self = useSelf();
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const { feedId } = conversation;
  // In a DM with the AI teammate, every message gets an inline reply.
  // Everywhere else, @mentioning the AI opens a thread and it replies there.
  const isAiDm =
    conversation.type === "dm" && conversation.user.id === AI_USER_ID;
  const notifyActivity = useNotifyActivity();
  const { messages } = useFeedMessages(feedId);
  const history = useMemo(
    () =>
      messages
        .filter(isChatMessage)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((message) => ({
          userId: message.data.userId,
          content: message.data.content,
        })),
    [messages]
  );
  const handleSend = useCallback(
    async (content: string) => {
      const messageId = nanoid();
      await createFeedMessage(
        feedId,
        {
          userId: self.id,
          content,
        },
        { id: messageId }
      );

      // Let the other side know: every DM lands in the recipient's activity,
      // while channel messages only notify the people tagged in them.
      if (conversation.type === "dm") {
        void notifyActivity([conversation.user.id], {
          type: "dm",
          feedId,
          messageId,
        });
      } else {
        void notifyActivity(getMentionedUserIds(content), {
          type: "mention",
          feedId,
          messageId,
        });
      }

      // The AI DM reply is handled by <Composer> itself (`forceAiReply`).
      // Elsewhere, @AI opens a thread and replies there, not in the feed.
      if (isAiDm || !content.includes(`<@${AI_USER_ID}>`)) {
        return;
      }

      const threadFeedId = getThreadFeedId(messageId);
      try {
        await createFeed(threadFeedId, {
          metadata: {
            type: "thread",
            channelId: feedId,
            parentMessageId: messageId,
            replyCount: "0",
            participantIds: [],
          },
        });
      } catch {
        // Another participant may have created the thread first.
      }

      onOpenThread?.(messageId);

      void fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          feedId: threadFeedId,
          messages: [{ userId: self.id, content }],
        }),
      });
    },
    [
      conversation,
      createFeed,
      createFeedMessage,
      feedId,
      isAiDm,
      notifyActivity,
      onOpenThread,
      roomId,
      self.id,
    ]
  );

  const placeholder =
    conversation.type === "channel"
      ? `Message #${conversation.channel.name}`
      : `Message ${conversation.user.info.name}`;

  return (
    <Composer
      feedId={feedId}
      roomId={roomId}
      placeholder={placeholder}
      history={history}
      onSend={handleSend}
      enableAiReply={isAiDm}
      forceAiReply={isAiDm}
    />
  );
}
