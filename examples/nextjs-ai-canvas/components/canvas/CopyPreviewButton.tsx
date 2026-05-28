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
      className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm hover:border-neutral-300"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Preview link copied" : "Copy preview"}
    </button>
  );
}
