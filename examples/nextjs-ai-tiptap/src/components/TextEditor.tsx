"use client";

import {
  ClientSideSuspense,
  useRoom,
  useThreads,
} from "@liveblocks/react/suspense";
import {
  FloatingComposer,
  FloatingThreads,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import Highlight from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view";
import { DocumentSpinner } from "@/primitives/Spinner";
import { CustomTaskItem } from "./CustomTaskItem";
import { StaticToolbar, SelectionToolbar } from "./Toolbars";
import { Avatars } from "@/components/Avatars";
import { AiChatPanel } from "./AiChatPanel";
import styles from "./TextEditor.module.css";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <TiptapEditor />
    </ClientSideSuspense>
  );
}

// Collaborative text editor with simple rich text and live cursors
export function TiptapEditor() {
  const liveblocks = useLiveblocksExtension();
  const room = useRoom();

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: styles.editor,
      },
    },
    extensions: [
      liveblocks,
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: "tiptap-blockquote",
          },
        },
        code: {
          HTMLAttributes: {
            class: "tiptap-code",
          },
        },
        codeBlock: {
          languageClassPrefix: "language-",
          HTMLAttributes: {
            class: "tiptap-code-block",
            spellcheck: false,
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "tiptap-heading",
          },
        },
        // The Collaboration extension comes with its own history handling
        history: false,
        horizontalRule: {
          HTMLAttributes: {
            class: "tiptap-hr",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "tiptap-list-item",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "tiptap-ordered-list",
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: "tiptap-paragraph",
          },
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "tiptap-highlight",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "tiptap-empty",
      }),
      CustomTaskItem,
      TaskList.configure({
        HTMLAttributes: {
          class: "tiptap-task-list",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      Youtube.configure({
        modestBranding: true,
        HTMLAttributes: {
          class: "tiptap-youtube",
        },
      }),
    ],
  });

  const { threads } = useThreads();

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <StaticToolbar editor={editor} />
        <Avatars />
      </div>
      <div className={styles.panels}>
        <div className={styles.editorPanel}>
          <SelectionToolbar editor={editor} />
          <EditorContent editor={editor} className={styles.editorContainer} />
          <FloatingComposer editor={editor} style={{ width: 350 }} />
          <FloatingThreads threads={threads} editor={editor} />
        </div>
        <div className={styles.aiPanel}>
          <AiChatPanel editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Prevents a matchesNode error on hot reloading
EditorView.prototype.updateState = function updateState(state) {
  // @ts-ignore
  if (!this.docView) return;
  // @ts-ignore
  this.updateStateInner(state, this.state.plugins != state.plugins);
};
