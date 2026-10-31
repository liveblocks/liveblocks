"use client";

import { useUploadFile } from "@liveblocks/react/suspense";
import {
  FileTextIcon,
  FileUpIcon,
  Loader2Icon,
  PenToolIcon,
  PlusIcon,
} from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateDocument, useDocuments } from "./use-documents";

export function NewDocMenu({
  onCreated,
  variant = "icon",
}: {
  onCreated: (docId: string) => void;
  variant?: "icon" | "button";
}) {
  const documents = useDocuments();
  const createDocument = useCreateDocument();
  const uploadFile = useUploadFile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function nextTitle(base: string) {
    const existing = new Set(documents.map((doc) => doc.title));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  async function handlePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const { validatePdf, preparePdf } = await import("./pdf-upload");
      validatePdf(file);
      setStatus("Uploading PDF…");
      const liveFile = await uploadFile(file);
      setStatus("Reading pages…");
      const { pageCount, records } = await preparePdf(file, liveFile.id);
      const docId = createDocument({
        type: "pdf",
        title: nextTitle(file.name.replace(/\.pdf$/i, "")),
        pdf: liveFile,
        pageCount,
        records,
      });
      onCreated(docId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add PDF");
    } finally {
      setStatus(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New document"
              disabled={status !== null}
            >
              {status ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            </Button>
          ) : (
            <Button disabled={status !== null}>
              {status ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              {status ?? "New document"}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() =>
              onCreated(
                createDocument({ type: "text", title: nextTitle("Lesson notes") })
              )
            }
          >
            <FileTextIcon />
            <span className="flex flex-col">
              Text document
              <span className="text-xs text-neutral-500">
                Rich text with comments
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              onCreated(
                createDocument({ type: "whiteboard", title: nextTitle("Whiteboard") })
              )
            }
          >
            <PenToolIcon />
            <span className="flex flex-col">
              Whiteboard
              <span className="text-xs text-neutral-500">Draw and sketch</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInput.current?.click()}>
            <FileUpIcon />
            <span className="flex flex-col">
              Upload PDF
              <span className="text-xs text-neutral-500">
                Annotate it together
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => void handlePdf(event)}
      />
      {status && variant === "icon" ? (
        <span className="sr-only" role="status">
          {status}
        </span>
      ) : null}
      {error ? (
        <p role="alert" className="px-3 pb-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
