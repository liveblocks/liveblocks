"use client";

import { Extension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Mention, { type MentionNodeAttrs } from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AI_USER } from "@/app/database";
import { UserAvatar } from "@/components/user-avatar";
import { AI_MENTION, AI_NAME, matchesAiMention } from "@/lib/ai-mention";
import { cn } from "@/lib/utils";

// The chat input: a one-paragraph Tiptap editor rather than a textarea, so
// that "@AI Assistant" is a proper mention pill with a suggestion popover,
// the way mentions work in the comments composer. Messages are still sent as
// plain text: the pill serializes to "@AI Assistant".

export type ChatComposerHandle = {
  clear: () => void;
  focus: () => void;
  // Adds an "@AI Assistant" mention, for the sparkle button
  mentionAi: () => void;
};

const AI_ITEM: MentionNodeAttrs = { id: AI_USER.id, label: AI_NAME };

type Props = {
  disabled?: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
};

export const ChatComposer = forwardRef<ChatComposerHandle, Props>(
  function ChatComposer({ disabled = false, onChange, onSubmit }, ref) {
    // Suggestion state lives in refs so the (one-off) extension config can
    // read the latest values, and in state so the popover re-renders
    const [suggestion, setSuggestion] = useState<SuggestionProps<
      MentionNodeAttrs,
      MentionNodeAttrs
    > | null>(null);
    const suggestionRef = useRef(suggestion);
    suggestionRef.current = suggestion;
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        Document,
        Paragraph,
        Text,
        HardBreak,
        Placeholder.configure({
          placeholder: `Write a message, or ${AI_MENTION} for help…`,
        }),
        Mention.configure({
          HTMLAttributes: { class: "chat-mention" },
          deleteTriggerWithBackspace: true,
          suggestion: {
            char: "@",
            // The assistant's name has a space in it
            allowSpaces: true,
            items: ({ query }) => (matchesAiMention(query) ? [AI_ITEM] : []),
            command: ({ editor, range, props }) => {
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  { type: "mention", attrs: props },
                  { type: "text", text: " " },
                ])
                .run();
            },
            render: () => ({
              onStart: (props) => setSuggestion(props),
              onUpdate: (props) => setSuggestion(props),
              onExit: () => setSuggestion(null),
              onKeyDown: ({ event }) => {
                const current = suggestionRef.current;
                if (!current || current.items.length === 0) return false;
                if (event.key === "Enter" || event.key === "Tab") {
                  current.command(current.items[0]);
                  return true;
                }
                if (event.key === "Escape") {
                  setSuggestion(null);
                  return true;
                }
                return false;
              },
            }),
          },
        }),
        // Enter sends, Shift+Enter adds a line break. Registered after the
        // mention extension so the suggestion popover gets Enter first.
        Extension.create({
          name: "chatKeymap",
          priority: 50,
          addKeyboardShortcuts() {
            return {
              Enter: () => {
                onSubmitRef.current();
                return true;
              },
              "Shift-Enter": () => this.editor.commands.setHardBreak(),
            };
          },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            // One line + the wrapper's border is 36px, same as the buttons
            "chat-composer max-h-32 overflow-y-auto px-3 py-[7px] text-sm leading-5 outline-none",
          "aria-label": "Message",
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getText({ blockSeparator: "\n" }));
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [editor, disabled]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => editor?.commands.clearContent(true),
        focus: () => editor?.commands.focus("end"),
        mentionAi: () => {
          if (!editor) return;
          const hasMention = editor.getText().includes(AI_MENTION);
          const chain = editor.chain().focus("end");
          if (!hasMention) {
            chain.insertContent([
              { type: "mention", attrs: AI_ITEM },
              { type: "text", text: " " },
            ]);
          }
          chain.run();
        },
      }),
      [editor]
    );

    const open = suggestion !== null && suggestion.items.length > 0;

    return (
      <div className="relative min-w-0 flex-1">
        {open ? (
          <div
            role="listbox"
            aria-label="Mention suggestions"
            className="absolute inset-x-0 bottom-full mb-1.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          >
            <button
              type="button"
              role="option"
              aria-selected
              className="flex w-full items-center gap-2.5 rounded-md bg-neutral-100 px-2 py-1.5 text-left text-sm"
              // Keep focus (and the caret) in the editor
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => suggestion.command(AI_ITEM)}
            >
              <UserAvatar info={AI_USER.info} size={24} />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{AI_NAME}</span>
                <span className="block truncate text-xs text-neutral-500">
                  Adds tables and translations, draws on whiteboards and PDFs
                </span>
              </span>
              <kbd className="rounded border border-neutral-200 px-1 font-sans text-[10px] text-neutral-500">
                ↵
              </kbd>
            </button>
          </div>
        ) : null}
        <EditorContent
          editor={editor}
          className={cn(
            "rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />
      </div>
    );
  }
);
