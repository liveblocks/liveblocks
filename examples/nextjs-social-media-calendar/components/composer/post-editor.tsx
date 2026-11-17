"use client";

import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "@liveblocks/prosemirror";
import { useThreads } from "@liveblocks/react/suspense";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
  FloatingToolbar,
  Toolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import { getInitialDocument, truncatePreview } from "@/lib/posts";
import { findLastUrl } from "@/lib/urls";

const PREVIEW_SYNC_DELAY_MS = 400;

type PostEditorProps = {
  postId: string;
  platforms: Platform[];
  preview: string;
  linkUrl: string | undefined;
  /** Called, debounced, when the snippet or the last link in the text changes. */
  onPreviewChange: (preview: string, linkUrl: string | undefined) => void;
  /** The current plain text, for the character count and link card. */
  onTextChange: (text: string) => void;
  /**
   * The column beside the post where threads are shown anchored to their
   * text on wide screens. The editor renders them there through a portal,
   * since they need the editor and the post's room.
   */
  threadsContainer: HTMLElement | null;
  /** Called when the number of unresolved threads changes. */
  onOpenThreadsChange: (openThreads: number) => void;
};

/**
 * The post body: a Tiptap editor whose document is stored as LiveText in the
 * post's room (`collaborationMode: "liveblocks"`), so everyone with the post
 * open edits the same caption with live carets. Plain text only, like the
 * networks it's written for: paragraphs, line breaks, and links that are
 * recognized as they're typed and open on click. No other formatting.
 *
 * Selecting text shows a floating "comment" button; comments are Liveblocks
 * threads anchored to the text (`FloatingComposer` to write one). On wide
 * screens the threads sit in a column beside the post, level with the text
 * they're about (`AnchoredThreads`); on narrow ones they open as a popup
 * from the highlight (`FloatingThreads`).
 */
export function PostEditor({
  postId,
  platforms,
  preview,
  linkUrl,
  onPreviewChange,
  onTextChange,
  threadsContainer,
  onOpenThreadsChange,
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
        placeholder:
          platforms.length === 1
            ? `Write your ${PLATFORM_INFO[platforms[0]].label} post…`
            : "Write your post…",
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

  // Mirror a plain-text snippet of the body and its last link into the
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
    const nextLink = findLastUrl(text) ?? undefined;
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

  const { threads } = useThreads();
  // Resolved threads keep their highlight (and open as a popup from it) but
  // don't take a place in the column beside the post.
  const openThreads = useMemo(
    () => threads.filter((thread) => !thread.resolved),
    [threads]
  );
  const onOpenThreadsChangeRef = useRef(onOpenThreadsChange);
  onOpenThreadsChangeRef.current = onOpenThreadsChange;
  const openThreadCount = openThreads.length;
  useEffect(() => {
    onOpenThreadsChangeRef.current(openThreadCount);
  }, [openThreadCount]);

  return (
    <>
      <div
        className="composer-editor cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
      {/* No formatting here either: the floating toolbar only comments. */}
      <FloatingToolbar editor={editor}>
        <Toolbar.SectionCollaboration />
      </FloatingToolbar>
      <FloatingComposer editor={editor} className="w-[350px]" />
      <FloatingThreads
        editor={editor}
        threads={threads}
        className="w-[350px] xl:hidden"
      />
      {threadsContainer
        ? createPortal(
            <AnchoredThreads
              editor={editor}
              threads={openThreads}
              className="w-[350px]"
            />,
            threadsContainer
          )
        : null}
    </>
  );
}
