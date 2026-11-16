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
};

/**
 * The post body: a Tiptap editor whose document is stored as LiveText in the
 * post's room (`collaborationMode: "liveblocks"`), so everyone with the post
 * open edits the same caption with live carets. Laid out like the body of a
 * post: the text, then a row with the formatting tools and the character
 * count.
 */
export function PostEditor({
  postId,
  platform,
  preview,
  onPreviewChange,
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
    <div className="flex flex-col">
      <div
        className="composer-editor cursor-text pt-1 pb-3"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="-mx-2 flex items-center justify-between gap-3 border-t border-neutral-950/5 pt-2">
        <Toolbar editor={editor} className="composer-toolbar">
          <Toolbar.SectionHistory />
          <Toolbar.Separator />
          <Toolbar.SectionInline />
        </Toolbar>
        <span
          className={cn(
            "mr-2 text-xs tabular-nums text-neutral-500",
            overLimit ? "font-medium text-red-600" : undefined
          )}
          aria-live="polite"
        >
          {length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
