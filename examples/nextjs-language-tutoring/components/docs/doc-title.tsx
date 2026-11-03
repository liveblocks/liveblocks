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
    // The input is as wide as its text and grows/shrinks while typing: an
    // invisible copy of the text sizes the grid cell, and the input fills it.
    return (
      <span className="inline-grid max-w-full shrink">
        <span
          aria-hidden
          // Same box as the input (padding + border), text centered like it
          className="invisible col-start-1 row-start-1 flex h-7 items-center overflow-hidden border border-transparent px-2 text-sm font-medium whitespace-pre"
        >
          {draft || "Untitled"}
        </span>
        <input
          autoFocus
          value={draft}
          // An input is ~20 characters wide by default and the grid cell
          // would never shrink below that; let the text alone set the width
          size={1}
          maxLength={80}
          placeholder="Untitled"
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setDraft(doc.title);
              setEditing(false);
            }
          }}
          className="col-start-1 row-start-1 h-7 w-full min-w-0 rounded-md border border-neutral-300 px-2 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Document title"
        />
      </span>
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
