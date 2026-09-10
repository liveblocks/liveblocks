"use client";

import { LIVEBLOCKS_COLLABORATION_PLUGIN_KEY } from "@liveblocks/prosemirror";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import {
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import { CheckIcon, CopyIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanWrite } from "@/app/providers";
import { PanelIconButton } from "@/components/side-panel";
import { DOCUMENT_EXTENSIONS } from "@/lib/document-schema";

/** How long after the last keystroke to note a document as updated */
const TOUCH_DEBOUNCE_MS = 2_000;

/**
 * One of the documents the agent wrote for this chat, as a multiplayer
 * Tiptap editor bound to Storage. Team members edit it together, with each
 * other's cursors; viewers can only read. The agent's next rewrite is
 * patched into the same tree block by block, so edits made meanwhile stay.
 */
export function DocumentView({ documentKey }: { documentKey: string }) {
  const document = useStorage((root) => root.documents?.[documentKey]);
  const canWrite = useCanWrite();
  const [copied, setCopied] = useState(false);

  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: documentKey,
    comments: false,
    mentions: false,
  });

  // Keep the metadata people see in the tabs and cards in step with local
  // edits: the timestamp, and the title if the first heading changed
  const touch = useMutation(
    ({ storage }, title: string | undefined) => {
      const record = storage.get("documents")?.get(documentKey);
      if (!record) {
        return;
      }
      record.set("updatedAt", new Date().toISOString());
      if (title && title !== record.get("title")) {
        record.set("title", title);
      }
    },
    [documentKey]
  );
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: [liveblocks, ...DOCUMENT_EXTENSIONS, Markdown],
      editable: canWrite,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose-chat prose-document min-h-full p-5 text-sm leading-relaxed outline-none",
        },
      },
      onUpdate: ({ editor, transaction }) => {
        if (
          !transaction.docChanged ||
          transaction.getMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY)
        ) {
          return;
        }
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
        touchTimeoutRef.current = setTimeout(() => {
          const first = editor.state.doc.firstChild;
          const title =
            first?.type.name === "heading" && first.attrs.level === 1
              ? first.textContent.trim()
              : undefined;
          touch(title || undefined);
        }, TOUCH_DEBOUNCE_MS);
      },
    },
    [documentKey, canWrite]
  );

  useEffect(
    () => () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = useCallback(() => {
    if (!editor) {
      return;
    }
    void navigator.clipboard
      .writeText(editor.getMarkdown())
      .then(() => setCopied(true));
  }, [editor]);

  const download = useCallback(() => {
    if (!document || !editor) {
      return;
    }
    const blob = new Blob([editor.getMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.slug}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [document, editor]);

  if (!document) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted">
        This document was removed.
      </div>
    );
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <FileTextIcon className="size-4 shrink-0 text-muted" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2 text-[11px] text-muted">
          <span className="truncate font-mono">{document.slug}.md</span>
          <span className="shrink-0">
            Updated {formatRelative(document.updatedAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <PanelIconButton
            label={copied ? "Copied" : "Copy Markdown"}
            onClick={copy}
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-success" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </PanelIconButton>
          <PanelIconButton label="Download" onClick={download}>
            <DownloadIcon className="size-3.5" />
          </PanelIconButton>
        </div>
      </div>

      <div className="document-editor min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
        {canWrite ? <FloatingToolbar editor={editor} /> : null}
      </div>
    </>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
