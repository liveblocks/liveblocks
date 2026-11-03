"use client";

import { Loader2Icon, SendIcon, Trash2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useRef, useState } from "react";
import {
  DOC_TYPE_ICONS,
  DOC_TYPE_LABELS,
} from "@/components/chat/snapshot-card";
import { type SnapshotPayload, useChat } from "@/components/chat/use-chat";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DocumentInfo } from "@/liveblocks.config";
import { DocTitle } from "./doc-title";
import { EmptyRoom } from "./empty-room";
import { SendToChatDialog } from "./send-to-chat-dialog";
import { TextDoc } from "./text-doc";
import { useDeleteDocument, useDocument } from "./use-documents";

// tldraw and pdf.js are browser-only and heavy; load them on demand
const WhiteboardDoc = dynamic(
  () => import("./whiteboard-doc").then((m) => m.WhiteboardDoc),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Loader2Icon className="size-5 animate-spin text-neutral-400" />
      </div>
    ),
  }
);

// Documents register how to produce a snapshot of themselves; the header's
// "Send to chat" button calls it.
export type SnapshotProducer = (options: {
  page?: number;
}) => Promise<SnapshotPayload>;

export function DocumentView({
  docId,
  onDeleted,
}: {
  docId: string | null;
  onDeleted: () => void;
}) {
  const doc = useDocument(docId);

  if (!doc) {
    return <EmptyRoom />;
  }
  // Keyed so each document gets a fresh editor / tldraw store
  return <Document key={doc.id} doc={doc} onDeleted={onDeleted} />;
}

function Document({
  doc,
  onDeleted,
}: {
  doc: DocumentInfo;
  onDeleted: () => void;
}) {
  const producer = useRef<SnapshotProducer | null>(null);
  const registerProducer = useCallback((fn: SnapshotProducer | null) => {
    producer.current = fn;
  }, []);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const { sendSnapshot } = useChat();
  const deleteDocument = useDeleteDocument();
  const Icon = DOC_TYPE_ICONS[doc.type];

  async function send(options: { page?: number; caption?: string }) {
    if (!producer.current) return;
    setSending(true);
    try {
      const payload = await producer.current({ page: options.page });
      await sendSnapshot(doc, payload, options.caption);
      setSendOpen(false);
    } finally {
      setSending(false);
    }
  }

  let body: ReactNode;
  switch (doc.type) {
    case "text":
      body = <TextDoc doc={doc} registerProducer={registerProducer} />;
      break;
    case "whiteboard":
    case "pdf":
      body = <WhiteboardDoc doc={doc} registerProducer={registerProducer} />;
      break;
  }

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 px-3">
        <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
        {/* Baseline-align the title and the smaller type label: centering
            two font sizes would leave the label floating slightly high */}
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <DocTitle doc={doc} />
          <span className="hidden shrink-0 text-xs text-neutral-400 sm:inline">
            {DOC_TYPE_LABELS[doc.type]}
            {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSendOpen(true)}
            disabled={sending}
          >
            {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            Send to chat
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete document"
                onClick={() => {
                  if (window.confirm(`Delete "${doc.title}"?`)) {
                    deleteDocument(doc.id);
                    onDeleted();
                  }
                }}
              >
                <Trash2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete document</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{body}</div>
      <SendToChatDialog
        doc={doc}
        open={sendOpen}
        onOpenChange={setSendOpen}
        sending={sending}
        onSend={send}
      />
    </>
  );
}
