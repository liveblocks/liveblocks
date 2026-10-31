"use client";

import { SparklesIcon } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import { NewDocMenu } from "./new-doc-menu";
import { useActiveDocId, useCreateDocument, useDocuments } from "./use-documents";

// Shown when a room has no documents (or the selected one was deleted)
export function EmptyRoom() {
  const documents = useDocuments();
  const createDocument = useCreateDocument();
  const [, setActiveDocId] = useActiveDocId();
  const { user } = useApp();

  function addStarterLesson() {
    const notesId = createDocument({ type: "text", title: "Lesson notes" });
    createDocument({ type: "whiteboard", title: "Whiteboard" });
    setActiveDocId(notesId);
  }

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
      <div className="flex items-center gap-2">
        {documents.length === 0 ? (
          <Button variant="outline" onClick={addStarterLesson}>
            <SparklesIcon />
            Add starter lesson
          </Button>
        ) : null}
        <NewDocMenu variant="button" onCreated={setActiveDocId} />
      </div>
    </div>
  );
}
