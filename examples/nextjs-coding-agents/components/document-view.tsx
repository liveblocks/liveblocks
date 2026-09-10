"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  PencilIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCanWrite } from "@/app/providers";
import { PanelIconButton } from "@/components/side-panel";
import { diffAsReplace, liveTextToString } from "@/lib/documents";
import { Markdown } from "@/lib/markdown";

/**
 * One of the documents the agent wrote for this chat, read live from
 * Storage. Rendered as Markdown by default; team members can switch to a
 * plain editor whose keystrokes become LiveText operations, so their edits
 * merge with everyone else's and with the agent's next rewrite.
 */
export function DocumentView({ documentKey }: { documentKey: string }) {
  const document = useStorage((root) => root.documents?.[documentKey]);
  const canWrite = useCanWrite();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateContent = useMutation(
    ({ storage }, next: string) => {
      const record = storage.get("documents")?.get(documentKey);
      if (!record) {
        return;
      }
      const content = record.get("content");
      const op = diffAsReplace(content.toString(), next);
      if (op) {
        content.replace(op.index, op.length, op.text);
        record.set("updatedAt", new Date().toISOString());
      }
    },
    [documentKey]
  );

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const markdown = document ? liveTextToString(document.content) : "";

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(markdown).then(() => setCopied(true));
  }, [markdown]);

  const download = useCallback(() => {
    if (!document) {
      return;
    }
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.slug}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [document, markdown]);

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
          {canWrite ? (
            <PanelIconButton
              label={editing ? "Preview" : "Edit"}
              active={editing}
              onClick={() => setEditing((value) => !value)}
            >
              <PencilIcon className="size-3.5" />
            </PanelIconButton>
          ) : null}
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

      {editing && canWrite ? (
        <textarea
          value={markdown}
          onChange={(event) => updateContent(event.target.value)}
          spellCheck={false}
          aria-label="Edit document"
          className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[12.5px] leading-relaxed outline-none"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Markdown
            content={markdown}
            className="prose-chat prose-document p-5 text-sm leading-relaxed"
          />
        </div>
      )}
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
