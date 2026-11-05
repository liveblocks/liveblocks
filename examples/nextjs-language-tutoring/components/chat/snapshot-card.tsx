"use client";

// Non-suspense variant so loading and errors render inline in the chat
import { useFileUrl } from "@liveblocks/react";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FileTypeIcon,
  Loader2Icon,
  PenToolIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentType } from "@/liveblocks.config";

type SnapshotData = Extract<Liveblocks["FeedMessageData"], { kind: "snapshot" }>;

export const DOC_TYPE_ICONS = {
  text: FileTextIcon,
  whiteboard: PenToolIcon,
  pdf: FileTypeIcon,
} satisfies Record<DocumentType, typeof FileTextIcon>;

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  text: "Text document",
  whiteboard: "Whiteboard",
  pdf: "PDF",
};

// A frozen copy of a document (or one of its pages) shared into the chat.
// Clicking it opens the snapshot as it was when it was sent.
export function SnapshotCard({
  data,
  onOpenDocument,
}: {
  data: SnapshotData;
  onOpenDocument: (docId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = DOC_TYPE_ICONS[data.docType];
  const subtitle = data.page
    ? `${DOC_TYPE_LABELS[data.docType]} · page ${data.page}`
    : DOC_TYPE_LABELS[data.docType];

  return (
    <>
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {data.docTitle}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {subtitle}
              </span>
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full border-t border-neutral-200 bg-white text-left"
          aria-label={`Open snapshot of ${data.docTitle}`}
        >
          {data.snapshotId ? (
            <SnapshotImage
              fileId={data.snapshotId}
              width={data.width}
              height={data.height}
              className="max-h-48 w-full object-contain object-top"
            />
          ) : data.html ? (
            <div
              className="prose-snapshot max-h-48 overflow-hidden p-3 text-xs"
              dangerouslySetInnerHTML={{ __html: data.html }}
            />
          ) : null}
        </button>
        {data.caption ? (
          <p className="px-3 py-2 text-sm">{data.caption}</p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="size-4 text-neutral-500" aria-hidden />
              {data.docTitle}
            </DialogTitle>
            <DialogDescription>
              {subtitle} · snapshot, as it was when it was shared
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-neutral-200 bg-neutral-50">
            {data.snapshotId ? (
              <SnapshotImage
                fileId={data.snapshotId}
                width={data.width}
                height={data.height}
                className="mx-auto block max-w-full"
              />
            ) : data.html ? (
              <div
                className="prose-snapshot p-6 text-sm"
                dangerouslySetInnerHTML={{ __html: data.html }}
              />
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <DownloadSnapshot data={data} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                onOpenDocument(data.docId);
              }}
            >
              <ExternalLinkIcon />
              Open live document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DownloadSnapshot({ data }: { data: SnapshotData }) {
  if (data.snapshotId) {
    return <DownloadImageSnapshot data={data} fileId={data.snapshotId} />;
  }
  if (!data.html) return null;
  return <DownloadHtmlSnapshot data={data} html={data.html} />;
}

function DownloadImageSnapshot({
  data,
  fileId,
}: {
  data: SnapshotData;
  fileId: string;
}) {
  const { url, isLoading, error } = useFileUrl(fileId);
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!url) return;
    setBusy(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      saveBlob(await response.blob(), snapshotFilename(data, "png"));
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DownloadButton
      label={data.docTitle}
      busy={busy || isLoading}
      disabled={!!error || !url}
      onClick={() => void download()}
    />
  );
}

function DownloadHtmlSnapshot({
  data,
  html,
}: {
  data: SnapshotData;
  html: string;
}) {
  function download() {
    const documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.docTitle)}</title>
<style>
  body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; line-height: 1.65; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #171717; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #d4d4d4; padding: 0.4em 0.6em; vertical-align: top; }
  th { background: #f5f5f5; text-align: left; }
  img { max-width: 100%; }
</style>
</head>
<body>
${html}
</body>
</html>`;
    saveBlob(
      new Blob([documentHtml], { type: "text/html" }),
      snapshotFilename(data, "html")
    );
  }

  return <DownloadButton label={data.docTitle} onClick={download} />;
}

function DownloadButton({
  label,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || busy}
      aria-label={`Download ${label} as shared in chat`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      Download
    </Button>
  );
}

function snapshotFilename(data: SnapshotData, extension: string) {
  const base = data.docTitle.replace(/[^\w.-]+/g, "_") || "snapshot";
  const page = data.page ? `-p${data.page}` : "";
  return `${base}${page}.${extension}`;
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function SnapshotImage({
  fileId,
  width,
  height,
  className,
}: {
  fileId: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const { url, isLoading, error } = useFileUrl(fileId);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2Icon className="size-4 animate-spin text-neutral-400" />
      </div>
    );
  }
  if (error || !url) {
    return (
      <p className="p-3 text-xs text-neutral-500">
        This snapshot is no longer available.
      </p>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Document snapshot"
      width={width}
      height={height}
      className={className}
    />
  );
}
