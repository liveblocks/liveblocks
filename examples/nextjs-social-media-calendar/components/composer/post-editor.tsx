"use client";

import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "@liveblocks/prosemirror";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { getInitialDocument, truncatePreview } from "@/lib/posts";
import { findFirstUrl } from "./urls";

const PREVIEW_SYNC_DELAY_MS = 400;

type PostEditorProps = {
  postId: string;
  platform: Platform;
  preview: string;
  linkUrl: string | undefined;
  /** Called, debounced, when the snippet or the first link in the text changes. */
  onPreviewChange: (preview: string, linkUrl: string | undefined) => void;
  /** The current plain text, for the character count and link card. */
  onTextChange: (text: string) => void;
};

/**
 * The post body: a Tiptap editor whose document is stored as LiveText in the
 * post's room (`collaborationMode: "liveblocks"`), so everyone with the post
 * open edits the same caption with live carets. Plain text only, like the
 * networks it's written for: paragraphs, line breaks, and links that are
 * recognized as they're typed and open on click. No other formatting.
 */
export function PostEditor({
  postId,
  platform,
  preview,
  linkUrl,
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
        // Social captions are plain text: no marks or block formatting,
        // except links, which networks recognize and make clickable.
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        code: false,
        link: {
          autolink: true,
          linkOnPaste: true,
          openOnClick: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
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

  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;
  useEffect(() => {
    // Nothing to report until the LiveText document has loaded.
    onTextChangeRef.current(isReady ? text : "");
  }, [text, isReady]);

  // Mirror a plain-text snippet of the body and its first link into the
  // project room, debounced, so the calendar and list cards can show them
  // without joining this room.
  const onPreviewChangeRef = useRef(onPreviewChange);
  onPreviewChangeRef.current = onPreviewChange;
  const storedRef = useRef({ preview, linkUrl });
  storedRef.current = { preview, linkUrl };
  useEffect(() => {
    if (!isReady) {
      return;
    }
    const nextPreview = truncatePreview(text);
    const nextLink = findFirstUrl(text) ?? undefined;
    const isStored = () =>
      nextPreview === storedRef.current.preview &&
      nextLink === storedRef.current.linkUrl;
    if (isStored()) {
      return;
    }
    const timeout = setTimeout(() => {
      if (!isStored()) {
        onPreviewChangeRef.current(nextPreview, nextLink);
      }
    }, PREVIEW_SYNC_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [text, isReady]);

  return (
    <div
      className="composer-editor cursor-text pt-1"
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
