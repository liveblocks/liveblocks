"use client";

import NotificationsPopover from "../notifications-popover";
import {
  useEditor,
  EditorContent,
  Editor,
  Extension,
  useEditorState,
} from "@tiptap/react";
import {
  useLiveblocksExtension,
  FloatingComposer,
  FloatingThreads,
  AnchoredThreads,
  Toolbar,
  FloatingToolbar,
  FloatingSuggestions,
} from "@liveblocks/react-tiptap";
import StarterKit from "@tiptap/starter-kit";
import { useThreads } from "@liveblocks/react";
import { useIsMobile } from "./use-is-mobile";
import VersionsDialog from "../version-history-dialog";

export default function TiptapEditor() {
  const liveblocks = useLiveblocksExtension({
    suggestions: true,
  });

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: "outline-none flex-1 transition-all",
      },
    },
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      liveblocks as Extension,
    ],
  });

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
        <VersionsDialog editor={editor} />
        <NotificationsPopover />
      </div>
      <div className="border-b border-border/80 bg-background">
        <Toolbar
          editor={editor}
          className="w-full"
          after={<SuggestionModeToggle editor={editor} />}
        />
      </div>
      <div className="relative flex flex-row justify-between w-full py-16 xl:pl-[250px] pl-[100px] gap-[50px]">
        <div className="relative flex flex-1 flex-col gap-2">
          <EditorContent editor={editor} />
          <FloatingComposer editor={editor} className="w-[350px]" />
          <FloatingSuggestions editor={editor} />
          <FloatingToolbar editor={editor} />
        </div>

        <div className="xl:[&:not(:has(.lb-tiptap-anchored-threads))]:pr-[200px] [&:not(:has(.lb-tiptap-anchored-threads))]:pr-[50px]">
          <Threads editor={editor} />
        </div>
      </div>
    </div>
  );
}

function SuggestionModeToggle({ editor }: { editor: Editor | null }) {
  const isSuggesting =
    useEditorState({
      editor,
      selector: (ctx) =>
        ctx.editor?.storage.liveblocksSuggestions?.mode === "suggesting",
      equalityFn: Object.is,
    }) ?? false;

  if (!editor || !("setSuggestionMode" in editor.commands)) {
    return null;
  }

  // This example depends on published packages. To test local suggestion changes,
  // build/link @liveblocks/react-tiptap into the example first.
  return (
    <Toolbar.Toggle
      name="Suggest edits"
      active={isSuggesting}
      onClick={() => editor.commands.setSuggestionMode(!isSuggesting)}
    >
      Suggest
    </Toolbar.Toggle>
  );
}

function Threads({ editor }: { editor: Editor | null }) {
  const { threads } = useThreads();
  const isMobile = useIsMobile();

  if (!threads || !editor) {
    return null;
  }

  return isMobile ? (
    <FloatingThreads threads={threads} editor={editor} />
  ) : (
    <AnchoredThreads
      threads={threads}
      editor={editor}
      className="w-[350px] xl:mr-[100px] mr-[50px]"
    />
  );
}
