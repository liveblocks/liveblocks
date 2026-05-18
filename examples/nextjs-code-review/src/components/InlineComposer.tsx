"use client";

import { Composer } from "@liveblocks/react-ui";
import type { ComposerSubmitComment } from "@liveblocks/react-ui";

interface Props {
  onSubmit: (body: ComposerSubmitComment["body"]) => void;
  onClose: () => void;
}

export function InlineComposer({ onSubmit, onClose }: Props) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700">
      <Composer
        className="rounded-md overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10"
        onComposerSubmit={({ body }, event) => {
          event.preventDefault();
          onSubmit(body);
        }}
      />
      <button
        className="self-start px-2.5 py-1 text-xs font-medium text-zinc-500 bg-transparent border border-zinc-200 rounded-md cursor-pointer transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-800"
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  );
}
