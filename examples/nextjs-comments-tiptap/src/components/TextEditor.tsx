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
import { Placeholder } from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, Editor as TEditor } from "@tiptap/react";
import StarterKit, { StarterKitOptions } from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view";
import { Avatars } from "@/components/Avatars";
import { DocumentSpinner } from "@/components/Spinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScenarioMenu } from "@/components/ScenarioMenu";
import { CustomFloatingThreads } from "@/components/CustomFloatingThreads";
import { useThreads } from "@liveblocks/react/suspense";
import { CommentIcon } from "@/icons";
import { useScenario } from "@/hooks/useScenario";
import clsx from "clsx";

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
  const { scenario } = useScenario();

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
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
    <div className="flex flex-col bg-surface absolute inset-0">
      <ScenarioMenu />
      <div className="flex-none flex justify-between items-start bg-surface-elevated border-b border-border p-3">
        <ThemeToggle />
        <Avatars />
      </div>
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {scenario !== "auth-hidden" && <FloatingToolbar editor={editor} />}
        <div
          className={clsx(
            "-ml-[310px] min-h-0 h-auto",
            "max-xl:ml-0 max-xl:px-8"
          )}
        >
          <div className="relative min-h-[1100px] w-full max-w-[800px] mx-auto my-8 border border-border bg-surface-elevated">
            <EditorContent editor={editor} />
            {scenario !== "auth-hidden" && (
              <FloatingComposer editor={editor} style={{ width: 350 }} />
            )}
            <div
              className={clsx(
                "absolute top-0 left-full ml-8 min-w-[310px]",
                "max-xl:hidden"
              )}
            >
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
  const { scenario } = useScenario();
  const isMobile = useIsMobile();

  if (!threads || !editor || scenario === "auth-hidden") {
    return null;
  }

  if (!isMobile && threads.length === 0) {
    return (
      <div className="text-text-lighter pt-8 flex flex-col gap-4 select-none ml-4 text-sm max-w-[260px] max-xl:bg-surface-elevated max-xl:border max-xl:border-border max-xl:shadow-sm max-xl:rounded-sm max-xl:p-8 max-xl:ml-0">
        <div className="text-text-light font-semibold text-lg">
          No comments yet
        </div>
        <p className="max-xl:inline-flex max-xl:items-center">
          Create a comment by selecting text and pressing the{" "}
          <CommentIcon className="inline -mt-0.5" /> Comment button.
        </p>
      </div>
    );
  }

  return isMobile ? (
    <CustomFloatingThreads threads={threads} editor={editor} />
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
