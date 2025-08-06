"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import {
  FloatingComposer,
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorView } from "@tiptap/pm/view";
import { EditorState } from "@tiptap/pm/state";
import StarterKit, { StarterKitOptions } from "@tiptap/starter-kit";
import { Avatars } from "@/components/Avatars";
import { DocumentSpinner } from "@/components/Spinner";
import { ScenarioMenu } from "@/components/ScenarioMenu";
import { Threads } from "@/components/Threads";
import { useScenario } from "@/hooks/useScenario";
import { Button } from "./Button";
import { createRoomWithContent } from "@/app/actions";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <Editor />
    </ClientSideSuspense>
  );
}

// Collaborative text editor with simple rich text and live cursors
export function Editor() {
  const liveblocks = useLiveblocksExtension({
    offlineSupport_experimental: true,
  });
  const { scenario } = useScenario();

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    editable: scenario === "auth-visible",
    editorProps: {
      attributes: {
        // Add styles to editor element
        class:
          "border-0 rounded-none flex-grow w-full h-full p-20 focus:outline-none",
      },
    },
    extensions: [
      liveblocks,
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
        ...starterKitOptions,
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "tiptap-empty",
      }),
    ],
  });

  return (
    <div
      className="flex flex-col bg-surface absolute inset-0"
      data-no-comments={scenario === "auth-hidden" || undefined}
    >
      <div className="flex-none flex justify-between items-center bg-surface-elevated border-b dark:border-neutral-800 p-3">
        <div className="flex justify-between items-center gap-3 w-full">
          {/* <ThemeToggle /> */}
          <ScenarioMenu />
          <div className="flex items-center">
            <Button onClick={() => createRoomWithContent()}>New file</Button>
            <Button onClick={() => createRoomWithContent("france")}>
              New file (France)
            </Button>
            <Button onClick={() => createRoomWithContent("beethoven")}>
              New file (Beethoven)
            </Button>
          </div>
        </div>
        <Avatars />
      </div>
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {scenario !== "anonymous" && <FloatingToolbar editor={editor} />}
        <div className="xl:-ml-[310px] min-h-0 h-auto xl:px-8">
          <div className="relative min-h-[1100px] w-full max-w-[800px] mx-auto my-8 border dark:border-neutral-800">
            <EditorContent editor={editor} />
            <FloatingComposer editor={editor} style={{ width: 350 }} />
            <div className="absolute top-0 left-full ml-8 min-w-[310px]">
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

// Prevents a matchesNode error on hot reloading
EditorView.prototype.updateState = function updateState(state: EditorState) {
  // @ts-ignore
  if (!this.docView) return;
  // @ts-ignore
  this.updateStateInner(state, this.state.plugins != state.plugins);
};
