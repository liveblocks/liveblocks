"use client";

import { useApp } from "@/components/app-context";
import { NewDocMenu } from "./new-doc-menu";
import { useActiveDocId, useDocuments } from "./use-documents";

// Shown when a room has no documents (or the selected one was deleted)
export function EmptyRoom() {
  const documents = useDocuments();
  const [, setActiveDocId] = useActiveDocId();
  const { user } = useApp();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div>
        <p className="font-medium">
          {documents.length === 0
            ? `Welcome${user ? `, ${user.info.name.split(" ")[0]}` : ""}!`
            : "Pick a document"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-neutral-500">
          {documents.length === 0
            ? "This room is empty. Add a text document, a whiteboard, or upload a PDF to annotate together."
            : "Choose a document in the sidebar, or create a new one."}
        </p>
      </div>
      <NewDocMenu variant="button" onCreated={setActiveDocId} />
    </div>
  );
}
