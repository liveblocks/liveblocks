"use client";

import { useState } from "react";
import type { DocumentInfo } from "@/liveblocks.config";
import { useRenameDocument } from "./use-documents";

// Click the title to rename the document
export function DocTitle({ doc }: { doc: DocumentInfo }) {
  const rename = useRenameDocument();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.title);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== doc.title) {
      rename(doc.id, draft);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={80}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(doc.title);
            setEditing(false);
          }
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-neutral-300 px-2 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Document title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(doc.title);
        setEditing(true);
      }}
      className="h-7 min-w-0 max-w-full truncate rounded-md px-2 text-left text-sm font-medium hover:bg-neutral-100"
      title="Rename"
    >
      {doc.title}
    </button>
  );
}
