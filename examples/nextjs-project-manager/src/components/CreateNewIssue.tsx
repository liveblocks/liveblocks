"use client";

import { createIssue } from "@/actions/liveblocks";

export function CreateNewIssue() {
  return (
    <button
      onClick={() => createIssue()}
      className="bg-white rounded px-2 py-0.5 shadow-sm border border-neutral-200 text"
    >
      + New
    </button>
  );
}
