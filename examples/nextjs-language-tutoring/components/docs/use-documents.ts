"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import {
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import type { TLRecord } from "tldraw";
import {
  createLiveblocksRecord,
  type LiveblocksTldrawRecordValue,
} from "@/components/tldraw/liveblocks-tldraw-storage";
import type { DocumentData, DocumentType } from "@/liveblocks.config";

export function useDocuments() {
  return useStorage((root) => root.documents);
}

export function useDocument(docId: string | null) {
  return useStorage((root) =>
    docId ? (root.documents.find((doc) => doc.id === docId) ?? null) : null
  );
}

// The active document is part of the URL (`?doc=<id>`) so chat snapshots can
// deep-link to it. The current user's presence mirrors it, so others can see
// which document everyone is looking at.
export function useActiveDocId() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const documents = useDocuments();
  const updateMyPresence = useUpdateMyPresence();

  const requested = searchParams.get("doc");
  const activeDocId =
    requested && documents.some((doc) => doc.id === requested)
      ? requested
      : (documents[0]?.id ?? null);

  const setActiveDocId = useCallback(
    (docId: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (docId) {
        next.set("doc", docId);
      } else {
        next.delete("doc");
      }
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    updateMyPresence({ docId: activeDocId });
  }, [activeDocId, updateMyPresence]);

  return [activeDocId, setActiveDocId] as const;
}

export function useCreateDocument() {
  return useMutation(
    (
      { storage, self },
      input: {
        type: DocumentType;
        title: string;
        pdf?: DocumentData["pdf"];
        pageCount?: number;
        // Initial tldraw records (the PDF's page shapes)
        records?: TLRecord[];
      }
    ) => {
      const id = nanoid(8);
      const doc = new LiveObject<DocumentData>({
        id,
        type: input.type,
        title: input.title,
        createdAt: Date.now(),
        createdBy: self.id,
        ...(input.pdf ? { pdf: input.pdf } : {}),
        ...(input.pageCount ? { pageCount: input.pageCount } : {}),
      });
      storage.get("documents").push(doc);
      if (input.type !== "text") {
        const records = new LiveMap<string, LiveblocksTldrawRecordValue>();
        for (const record of input.records ?? []) {
          records.set(record.id, createLiveblocksRecord(record));
        }
        storage.get("whiteboards").set(id, records);
      }
      return id;
    },
    []
  );
}

export function useRenameDocument() {
  return useMutation(({ storage }, docId: string, title: string) => {
    const doc = storage.get("documents").find((d) => d.get("id") === docId);
    doc?.set("title", title.trim() || "Untitled");
  }, []);
}

export function useDeleteDocument() {
  return useMutation(({ storage }, docId: string) => {
    const documents = storage.get("documents");
    const index = documents.findIndex((d) => d.get("id") === docId);
    if (index !== -1) {
      documents.delete(index);
    }
    storage.get("whiteboards").delete(docId);
  }, []);
}
