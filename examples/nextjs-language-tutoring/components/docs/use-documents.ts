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

// Documents without an explicit `order` keep the previous newest-first list.
function documentOrder(doc: { order?: number; createdAt: number }) {
  return doc.order ?? -doc.createdAt;
}

export function compareDocuments<T extends { order?: number; createdAt: number }>(
  a: T,
  b: T
) {
  const delta = documentOrder(a) - documentOrder(b);
  return delta !== 0 ? delta : b.createdAt - a.createdAt;
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
      const documents = storage.get("documents");
      const keys = documents.map(
        (existing) => existing.get("order") ?? -existing.get("createdAt")
      );
      const doc = new LiveObject<DocumentData>({
        id,
        type: input.type,
        title: input.title,
        createdAt: Date.now(),
        createdBy: self.id,
        // New documents go to the top of the sidebar
        order: keys.length === 0 ? 0 : Math.min(...keys) - 1,
        ...(input.pdf ? { pdf: input.pdf } : {}),
        ...(input.pageCount ? { pageCount: input.pageCount } : {}),
      });
      documents.push(doc);
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

// `toIndex` is the gap in the visible list: 0 is before the first document,
// and `length` is after the last. The order is stored on each document so
// everyone sees the same sidebar.
export function useReorderDocument() {
  return useMutation(({ storage }, docId: string, toIndex: number) => {
    const documents = storage.get("documents");
    const sorted = [...documents].sort((a, b) =>
      compareDocuments(
        { order: a.get("order"), createdAt: a.get("createdAt") },
        { order: b.get("order"), createdAt: b.get("createdAt") }
      )
    );
    const fromIndex = sorted.findIndex((doc) => doc.get("id") === docId);
    if (fromIndex < 0) return;
    const target = Math.max(
      0,
      Math.min(toIndex > fromIndex ? toIndex - 1 : toIndex, sorted.length - 1)
    );
    if (target === fromIndex) return;
    const next = sorted.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(target, 0, moved);
    next.forEach((doc, index) => {
      if (doc.get("order") !== index) doc.set("order", index);
    });
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
