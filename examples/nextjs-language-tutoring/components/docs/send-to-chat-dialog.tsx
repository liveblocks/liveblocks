"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DocumentInfo } from "@/liveblocks.config";

const DESCRIPTIONS: Record<DocumentInfo["type"], string> = {
  text: "A frozen copy of the document's current content is posted to the chat.",
  whiteboard: "An image of what's currently visible on the whiteboard is posted to the chat.",
  pdf: "An image of the chosen page, including everyone's annotations, is posted to the chat.",
};

export function SendToChatDialog({
  doc,
  open,
  onOpenChange,
  sending,
  onSend,
}: {
  doc: DocumentInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sending: boolean;
  onSend: (options: { page?: number; caption?: string }) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pageCount = doc.pageCount ?? 1;

  useEffect(() => {
    if (open) {
      setCaption("");
      setError(null);
      setPage((current) => Math.min(Math.max(1, current), pageCount));
    }
  }, [open, pageCount]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSend({
        page: doc.type === "pdf" ? page : undefined,
        caption,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the snapshot"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Send to chat</DialogTitle>
            <DialogDescription>{DESCRIPTIONS[doc.type]}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            {doc.type === "pdf" ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Page
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={page}
                    onChange={(event) =>
                      setPage(
                        Math.min(
                          Math.max(1, Number(event.target.value) || 1),
                          pageCount
                        )
                      )
                    }
                    className="w-24"
                  />
                  <span className="text-sm font-normal text-neutral-500">
                    of {pageCount}
                  </span>
                </div>
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Message <span className="font-normal text-neutral-400">(optional)</span>
              <Input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Look at the second paragraph…"
                maxLength={280}
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={sending}>
              {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
