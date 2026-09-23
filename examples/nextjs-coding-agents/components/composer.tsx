"use client";

import { Extension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ArrowUpIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type RefObject,
} from "react";
import {
  AgentMentionSuggestions,
  type AgentMentionItem,
} from "@/components/agent-mention-suggestions";
import { BranchSelect } from "@/components/branch-select";
import { ModelSelect } from "@/components/model-select";
import { RepoSelect } from "@/components/repo-select";
import { SkillSuggestions } from "@/components/skill-suggestions";
import { useTypingLabel } from "@/components/typing-indicator";
import { AI_USER_ID } from "@/lib/agent-user";
import { AGENT_MENTION_LABEL } from "@/lib/mentions";
import type { Repo } from "@/lib/repo";
import { isMessageEmpty, serializeMarkdown } from "@/lib/serialize-markdown";
import { searchSkills, type SkillSummary } from "@/lib/skills";
import { fetchSkills } from "@/lib/use-skills";
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

// Skills are Tiptap's Mention node under another name and trigger character:
// an inline atom with an id and a label, picked from a "/" popup.
const SkillNode = Mention.extend({ name: "skill" });

type PopupRef = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

/**
 * Mounts a React popup for a Tiptap suggestion (the "@" and "/" menus) and
 * routes keyboard events to it. `popupOpenRef` tells the editor's Enter
 * handler to leave Enter to the popup while one is open.
 */
function renderPopup<Item, Selected>(
  Component: ForwardRefExoticComponent<
    SuggestionProps<Item, Selected> & RefAttributes<PopupRef>
  >,
  popupOpenRef: RefObject<boolean>
): ReturnType<NonNullable<SuggestionOptions<Item, Selected>["render"]>> {
  let component: ReactRenderer<PopupRef> | null = null;
  let unmount: (() => void) | null = null;

  return {
    onStart: (props) => {
      popupOpenRef.current = true;
      component = new ReactRenderer(Component, {
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
}

export function Composer({
  typingKey,
  placeholder,
  repo,
  onRepoChange,
  model,
  onModelChange,
  onSend,
  disabled = false,
  autoFocus = true,
}: {
  // Presence key for "X is typing…", usually the feed id
  typingKey: string;
  placeholder: string;
  // null: no repository; the agent can still chat and write documents
  repo: Repo | null;
  // Only on the new chat screen; a chat's repository is fixed once created
  onRepoChange?: (repo: Repo | null) => void;
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
      // `@AI`: the only mention there is. Guarantees the message reaches
      // the agent instead of being judged as chat between teammates.
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        renderText({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: "@",
          pluginKey: new PluginKey("agentMention"),
          items: ({ query }): AgentMentionItem[] =>
            AGENT_MENTION_LABEL.toLowerCase().startsWith(query.toLowerCase())
              ? [{ id: AI_USER_ID, label: AGENT_MENTION_LABEL }]
              : [],
          render: () => renderPopup(AgentMentionSuggestions, popupOpenRef),
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
          items: async ({ query }): Promise<SkillSummary[]> =>
            searchSkills(await fetchSkills(), query),
          render: () => renderPopup(SkillSuggestions, popupOpenRef),
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
          "rounded-2xl border border-border bg-background shadow-lg/6 transition focus-within:border-subtle",
          disabled && "opacity-60"
        )}
      >
        <EditorContent editor={editor} className="pt-1" />

        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <ModelSelect
            value={model}
            onChange={onModelChange}
            disabled={disabled}
          />

          <RepoSelect
            value={repo}
            onChange={onRepoChange}
            disabled={disabled}
          />
          {repo ? (
            <BranchSelect
              repo={repo}
              onChange={
                onRepoChange
                  ? (ref) => onRepoChange({ ...repo, ref })
                  : undefined
              }
              disabled={disabled}
            />
          ) : null}
          <div className="grow" />
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
