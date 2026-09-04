"use client";

import { Extension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ArrowUpIcon, GitBranchIcon, LockIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getUsers } from "@/app/database";
import {
  MentionSuggestions,
  type MentionItem,
  type MentionSuggestionsRef,
} from "@/components/mention-suggestions";
import { ModelSelect } from "@/components/model-select";
import {
  SkillSuggestions,
  type SkillSuggestionsRef,
} from "@/components/skill-suggestions";
import { useTypingLabel } from "@/components/typing-indicator";
import { getRepoName, REPO_LOCKED, type Repo } from "@/lib/repo";
import { isMessageEmpty, serializeMarkdown } from "@/lib/serialize-markdown";
import { searchSkills, type Skill } from "@/lib/skills";
import "./composer.css";

function createPlaceholderExtension(placeholder: string) {
  return Extension.create({
    name: "messagePlaceholder",
    addOptions() {
      return { placeholder };
    },
    addProseMirrorPlugins() {
      const text = this.options.placeholder;

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
                  "data-placeholder": text,
                }),
              ]);
            },
          },
        }),
      ];
    },
  });
}

const MENTION_USERS: MentionItem[] = getUsers().map((user) => ({
  id: user.id,
  label: user.info.name,
  avatar: user.info.avatar,
}));

function filterMentionItems(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return MENTION_USERS;
  }
  return MENTION_USERS.filter((user) =>
    user.label.toLowerCase().includes(normalized)
  );
}

// Skills reuse the Mention node under a different name and trigger character,
// so the `/` popup gets the same keyboard handling as `@` mentions.
const SkillNode = Mention.extend({ name: "skill" });

export function Composer({
  typingKey,
  placeholder,
  repo,
  model,
  onModelChange,
  onSend,
  disabled = false,
  autoFocus = true,
}: {
  // Presence key for "X is typing…", usually the feed id
  typingKey: string;
  placeholder: string;
  repo: Repo;
  model: string;
  onModelChange: (modelId: string) => void;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const typingLabel = useTypingLabel(typingKey);
  const updateMyPresence = useUpdateMyPresence();
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const inFlightRef = useRef(false);
  const sendMessageRef = useRef<() => Promise<void>>(async () => {});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While a suggestion popup is open, Enter must pick a suggestion instead
  // of sending. Direct editor props run before the suggestion plugin's
  // handler, so we track the popup state ourselves.
  const popupOpenRef = useRef(false);

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
        HTMLAttributes: { class: "mention" },
        renderText({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: "@",
          pluginKey: new PluginKey("mentionSuggestion"),
          items: ({ query }) => filterMentionItems(query),
          render: () => {
            let component: ReactRenderer<MentionSuggestionsRef> | null = null;
            let unmount: (() => void) | null = null;

            return {
              onStart: (props) => {
                popupOpenRef.current = true;
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
                popupOpenRef.current = false;
                unmount?.();
                component?.destroy();
                component = null;
                unmount = null;
              },
            };
          },
        },
      }),
      SkillNode.configure({
        HTMLAttributes: { class: "skill" },
        renderText({ node }) {
          return `/${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: "/",
          pluginKey: new PluginKey("skillSuggestion"),
          // Only trigger at the start of a line or after a space, so URLs
          // and paths don't open the popup.
          allowedPrefixes: [" "],
          startOfLine: false,
          items: ({ query }): Skill[] => searchSkills(query),
          render: () => {
            let component: ReactRenderer<SkillSuggestionsRef> | null = null;
            let unmount: (() => void) | null = null;

            return {
              onStart: (props) => {
                popupOpenRef.current = true;
                component = new ReactRenderer(SkillSuggestions, {
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
                popupOpenRef.current = false;
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
        if (popupOpenRef.current) {
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
      updateMyPresence({ typingIn: typingKey });
      scheduleTypingClear();
    },
  });

  const sendMessage = useCallback(async () => {
    if (!editor || inFlightRef.current || disabled) {
      return;
    }

    const doc = editor.getJSON();
    if (isMessageEmpty(doc)) {
      return;
    }

    const content = serializeMarkdown(doc);
    inFlightRef.current = true;
    setIsSending(true);
    clearTyping();

    // Clear right away: `onSend` may navigate to a new chat and unmount
    // this composer (and destroy the editor) before it resolves.
    editor.commands.clearContent(true);
    setIsEmpty(true);

    try {
      await onSend(content);
    } catch {
      // The caller reports the error; put the message back so it can be
      // retried.
      if (!editor.isDestroyed) {
        editor.commands.setContent(doc, { emitUpdate: true });
        setIsEmpty(false);
      }
    } finally {
      inFlightRef.current = false;
      if (!editor.isDestroyed) {
        setIsSending(false);
      }
    }
  }, [clearTyping, disabled, editor, onSend]);

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    return () => {
      clearTyping();
    };
  }, [clearTyping, typingKey]);

  useEffect(() => {
    if (autoFocus) {
      editor?.commands.focus("end");
    }
  }, [autoFocus, editor, typingKey]);

  const canSend = !isEmpty && !isSending && !disabled;

  return (
    <div className="shrink-0">
      <div
        className={clsx(
          "rounded-xl border border-border bg-background shadow-sm transition focus-within:border-subtle",
          disabled && "opacity-60"
        )}
      >
        <EditorContent editor={editor} />

        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <ModelSelect
            value={model}
            onChange={onModelChange}
            disabled={disabled}
          />

          <span
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted"
            title={
              REPO_LOCKED ? "Repository is locked for this demo" : "Repository"
            }
          >
            <GitBranchIcon className="size-3.5" />
            <span className="max-w-48 truncate">
              {getRepoName(repo.url)}
              <span className="text-subtle"> · {repo.ref}</span>
            </span>
            {REPO_LOCKED ? <LockIcon className="size-3 text-subtle" /> : null}
          </span>

          <span className="ml-auto hidden text-[11px] text-subtle sm:block">
            <kbd className="font-sans">@</kbd> mention ·{" "}
            <kbd className="font-sans">/</kbd> skills
          </span>

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!canSend}
            className={clsx(
              "ml-1 flex size-7 items-center justify-center rounded-full transition",
              canSend
                ? "bg-foreground text-background hover:opacity-90"
                : "cursor-not-allowed bg-panel-active text-subtle"
            )}
            aria-label="Send message"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </div>
      <p
        className={clsx(
          "mt-1.5 h-4 truncate text-[11px] text-subtle",
          typingLabel && "italic"
        )}
        aria-live="polite"
      >
        {typingLabel ?? ""}
      </p>
    </div>
  );
}
