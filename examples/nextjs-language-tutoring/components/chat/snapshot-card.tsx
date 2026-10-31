"use client";

// Non-suspense variant so loading and errors render inline in the chat
import { useFileUrl } from "@liveblocks/react";
import {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-left transition hover:border-neutral-300 hover:bg-neutral-100"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {data.docTitle}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              {subtitle}
            </span>
          </span>
        </div>
        <div className="border-t border-neutral-200 bg-white">
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
        </div>
        {data.caption ? (
          <p className="px-3 py-2 text-sm">{data.caption}</p>
        ) : null}
      </button>

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
          <div className="flex justify-end">
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
