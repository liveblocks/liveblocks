"use client";

import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "@liveblocks/prosemirror";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, type ReactNode } from "react";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { getInitialDocument, truncatePreview } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { LinkCard } from "./link-card";
import { findFirstUrl } from "./urls";

const PREVIEW_SYNC_DELAY_MS = 400;

type PostEditorProps = {
  postId: string;
  platform: Platform;
  preview: string;
  onPreviewChange: (preview: string) => void;
  /** Shown under the text, before the link card: the post's media. */
  attachments?: ReactNode;
  /** Shown at the start of the footer, next to the character count. */
  actions?: ReactNode;
};

/**
 * The post body: a Tiptap editor whose document is stored as LiveText in the
 * post's room (`collaborationMode: "liveblocks"`), so everyone with the post
 * open edits the same caption with live carets. Plain text only, like the
 * networks it's written for: paragraphs and line breaks, no formatting. The
 * first link in the text gets a preview card under the post.
 */
export function PostEditor({
  postId,
  platform,
  preview,
  onPreviewChange,
  attachments,
  actions,
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
        // Social captions are plain text: no marks or block formatting
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        code: false,
        link: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        horizontalRule: false,
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
  const url = isReady ? findFirstUrl(text) : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="composer-editor cursor-text pt-1"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      {attachments}

      {url ? <LinkCard url={url} /> : null}

      <div className="-mx-2 flex items-center justify-between gap-3 border-t border-neutral-950/5 px-2 pt-2">
        <div className="flex items-center gap-1">{actions}</div>
        <span
          className={cn(
            "text-xs text-neutral-500 tabular-nums",
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
