"use client";

import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "@liveblocks/prosemirror";
import { Toolbar, useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { getInitialDocument, truncatePreview } from "@/lib/posts";
import { cn } from "@/lib/utils";

const PREVIEW_SYNC_DELAY_MS = 400;

type PostEditorProps = {
  postId: string;
  platform: Platform;
  preview: string;
  onPreviewChange: (preview: string) => void;
  onTextChange: (text: string) => void;
};

/**
 * The post body: a Tiptap editor whose document is stored as LiveText in the
 * post's room (`collaborationMode: "liveblocks"`), so everyone with the post
 * open edits the same caption with live carets.
 */
export function PostEditor({
  postId,
  platform,
  preview,
  onPreviewChange,
  onTextChange,
}: PostEditorProps) {
  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: "body",
    // Seeded posts start with sample copy, new posts start empty. Only used
    // the first time the post room is opened.
    initialContent: getInitialDocument(postId),
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      liveblocks,
      StarterKit.configure({
        // The Liveblocks extension comes with its own history handling
        undoRedo: false,
        // Social captions are plain text with a little inline formatting
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder: `Write your ${PLATFORM_INFO[platform].label} post…`,
      }),
    ],
    editorProps: {
      attributes: {
        class: "composer-editor-content",
      },
    },
  });

  const { text, isReady } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      text: editor?.getText({ blockSeparator: "\n" }) ?? "",
      // `isReady` flips to true once the LiveText document has been loaded
      // from Storage, so we don't publish an empty preview before that.
      isReady: editor
        ? (LIVEBLOCKS_COLLABORATION_PLUGIN_KEY.getState(editor.state)
            ?.isReady ?? false)
        : false,
    }),
  }) ?? { text: "", isReady: false };

  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;
  useEffect(() => {
    onTextChangeRef.current(text);
  }, [text]);

  // Mirror a plain-text snippet of the body into the project room, debounced,
  // so the calendar and list cards can show it without joining this room.
  const onPreviewChangeRef = useRef(onPreviewChange);
  onPreviewChangeRef.current = onPreviewChange;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useEffect(() => {
    if (!isReady) {
      return;
    }
    const nextPreview = truncatePreview(text);
    if (nextPreview === previewRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      if (nextPreview !== previewRef.current) {
        onPreviewChangeRef.current(nextPreview);
      }
    }, PREVIEW_SYNC_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [text, isReady]);

  const maxLength = PLATFORM_INFO[platform].maxLength;
  const length = text.length;
  const overLimit = length > maxLength;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-950/5">
        <Toolbar editor={editor} className="w-full">
          <Toolbar.SectionHistory />
          <Toolbar.Separator />
          <Toolbar.SectionInline />
        </Toolbar>
      </div>

      <div
        className="composer-editor min-h-0 flex-1 cursor-text overflow-y-auto px-5 py-4"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-950/5 px-4 py-2 text-xs text-neutral-500">
        <span>
          Changes save automatically and sync to everyone in realtime.
        </span>
        <span
          className={cn(
            "tabular-nums",
            overLimit ? "font-medium text-red-600" : undefined
          )}
          aria-live="polite"
        >
          {length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </footer>
    </div>
  );
}
