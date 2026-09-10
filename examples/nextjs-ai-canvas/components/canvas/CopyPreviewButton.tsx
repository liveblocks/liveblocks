"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyPreviewButton({ fileId }: { fileId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/file/readonly/${fileId}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sky-700 bg-sky-700 px-2.5 text-xs font-medium text-white shadow-sm hover:bg-sky-600"
    >
      {copied ? (
        <Check size={14} className="opacity-80" />
      ) : (
        <Copy size={14} className="opacity-80" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
