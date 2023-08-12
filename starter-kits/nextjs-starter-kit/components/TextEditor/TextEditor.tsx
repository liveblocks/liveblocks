"use client";

import {
  useEditor,
  EditorContent,
  BubbleMenu,
  isTextSelection,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom, useSelf } from "../../liveblocks.config";
import { useEffect, useState } from "react";
import { Toolbar } from "./Toolbar";
import styles from "./TextEditor.module.css";
import { ClientSideSuspense } from "@liveblocks/react";
import { DocumentSpinner } from "../../primitives/Spinner";
import { ToolbarInline } from "./ToolbarInline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { EditorView } from "prosemirror-view";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Image } from "@tiptap/extension-image";
import { WordCount } from "./WordCount";
import { SelectionMenu } from "./SelectionMenu";
import Youtube from "@tiptap/extension-youtube";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      {() => <Editor />}
    </ClientSideSuspense>
  );
}

// Collaborative text editor with simple rich text and live cursors
export function Editor() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!doc || !provider) {
    return null;
  }

  return <TiptapEditor doc={doc} provider={provider} />;
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function TiptapEditor({ doc, provider }: EditorProps) {
  // Get user info from Liveblocks authentication endpoint
  const { name, color, avatar: picture } = useSelf((me) => me.info);

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: styles.editor,
      },
    },
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "tiptap-heading",
          },
        },
        code: {
          HTMLAttributes: {
            class: "tiptap-code",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "tiptap-blockquote",
          },
        },
        codeBlock: {
          languageClassPrefix: "language-",
          HTMLAttributes: {
            class: "tiptap-code-block",
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
      CharacterCount,
      Image.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "tiptap-empty",
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
      // Register the document with Tiptap
      Collaboration.configure({
        document: doc,
      }),
      // Attach provider and user info
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name,
          color,
          picture,
        },
      }),
    ],
  });

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        {editor && <Toolbar editor={editor} />}
      </div>
      <div className={styles.editorPanel}>
        {editor && <SelectionMenu editor={editor} />}
        <EditorContent editor={editor} className={styles.editorContainer} />
      </div>
      {editor && <WordCount editor={editor} />}
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
