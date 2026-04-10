"use client";

import { useSyncExternalStore } from "react";
import { ClientSideSuspense } from "@liveblocks/react";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { EditorContent, useEditor, Editor as TEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import StarterKit, { StarterKitOptions } from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view";
import { Avatars } from "@/components/Avatars";
import { DocumentSpinner } from "@/components/Spinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThreads } from "@liveblocks/react/suspense";
import { CommentIcon } from "@/icons";
import styles from "./TextEditor.module.css";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <Editor />
    </ClientSideSuspense>
  );
}

// Collaborative text editor with simple rich text and live cursors
export function Editor() {
  const liveblocks = useLiveblocksExtension();

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: styles.editor,
      },
    },
    extensions: [
      liveblocks,
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        undoRedo: false,
        ...starterKitOptions,
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "tiptap-empty",
      }),
    ],
  });

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <ThemeToggle />
        <Avatars />
      </div>
      <div className={styles.editorPanel}>
        <FloatingToolbar editor={editor} />
        <div className={styles.editorContainerOffset}>
          <div className={styles.editorContainer}>
            <EditorContent editor={editor} />
            <FloatingComposer editor={editor} style={{ width: 350 }} />
            <div className={styles.threads}>
              <Threads editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const starterKitOptions: Partial<StarterKitOptions> = {
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
};

function Threads({ editor }: { editor: TEditor | null }) {
  const { threads } = useThreads();
  const isMobile = useIsMobile();

  if (!threads || !editor) {
    return null;
  }

  if (!isMobile && threads.length === 0) {
    return (
      <div className={styles.noComments}>
        <div className={styles.noCommentsHeader}>No comments yet</div>
        <p>
          Create a comment by selecting text and pressing the{" "}
          <CommentIcon className={styles.noCommentsIcon} /> Comment button.
        </p>
      </div>
    );
  }

  return isMobile ? (
    <FloatingThreads threads={threads} editor={editor} />
  ) : (
    <AnchoredThreads threads={threads} editor={editor} style={{ width: 350 }} />
  );
}

function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(callback: () => void) {
  const query = window.matchMedia("(max-width: 1279px)");

  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  const query = window.matchMedia("(max-width: 1279px)");
  return query.matches;
}

// Prevents a matchesNode error on hot reloading
EditorView.prototype.updateState = function updateState(state) {
  // @ts-ignore
  if (!this.docView) return;
  // @ts-ignore
  this.updateStateInner(state, this.state.plugins != state.plugins);
};
