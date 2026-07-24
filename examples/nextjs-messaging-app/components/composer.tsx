"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { AI_USER, AI_USER_ID, getUsers } from "@/app/database";
import type { Channel } from "@/lib/workspaces";
import { isMessageEmpty, serializeMarkdown } from "@/lib/serialize-markdown";
import {
  MentionSuggestions,
  type MentionItem,
  type MentionSuggestionsRef,
} from "@/components/mention-suggestions";
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
  channel,
  roomId,
}: {
  channel: Channel;
  roomId: string;
}) {
  const self = useSelf();
  const createFeedMessage = useCreateFeedMessage();
  const updateMyPresence = useUpdateMyPresence();
  const { messages } = useFeedMessages(channel.id);
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
      createPlaceholderExtension(`Message #${channel.name}`),
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
        class: "composer-editor",
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
    onUpdate: () => {
      updateMyPresence({ typingIn: channel.id });
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
      await createFeedMessage(channel.id, {
        userId: self.id,
        content,
      });

      editor.commands.clearContent(true);

      if (content.includes(`<@${AI_USER_ID}>`)) {
        const sorted = [...(messages ?? [])].sort(
          (a, b) => a.createdAt - b.createdAt
        );
        const history = [
          ...sorted.slice(-24).map((message) => ({
            userId: message.data.userId,
            content: message.data.content,
          })),
          { userId: self.id, content },
        ];

        void fetch("/api/ai-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            feedId: channel.id,
            messages: history,
          }),
        });
      }
    } catch {
      // Best-effort in this demo.
    } finally {
      inFlightRef.current = false;
    }
  }, [
    channel.id,
    clearTyping,
    createFeedMessage,
    editor,
    messages,
    roomId,
    self.id,
  ]);

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, [clearTyping]);

  useEffect(() => {
    editor?.commands.focus("end");
  }, [channel.id, editor]);

  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
      <div className="rounded-xl border border-neutral-300 bg-white shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
        <EditorContent editor={editor} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Enter to send · Shift+Enter for a new line · @mention teammates or the
        AI
      </p>
    </div>
  );
}
