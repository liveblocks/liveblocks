"use client";

import { type Editor } from "tldraw";
import { LayerList } from "@/components/canvas/LayerList";

export function ComponentsTab({ editor }: { editor: Editor | null }) {
  return (
    <div className="h-full min-h-0 bg-neutral-50 px-3 py-2">
      <LayerList editor={editor} />
    </div>
  );
}
