"use client";

import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useValue, type Editor, type TLShape } from "tldraw";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { getHtmlBoxDataFromShapeLike } from "@/lib/htmlBox";
import { Canvas } from "./Canvas";
import { CopyPreviewButton } from "./CopyPreviewButton";
import { HtmlBoxDrawer } from "./HtmlBoxDrawer";
import { Toolbar } from "./Toolbar";

export function CanvasShell({
  fileId,
  roomId,
  readonly,
}: {
  fileId: string;
  roomId: string;
  readonly: boolean;
}) {
  const updateMyPresence = useUpdateMyPresence();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!readonly);
  const [htmlToolOpen, setHtmlToolOpen] = useState(false);

  const selectedIds = useValue(
    "current-selected-shape-ids",
    () => editor?.getSelectedShapeIds() ?? [],
    [editor]
  );
  const selectedShapes = useValue(
    "selected-shapes-for-html-tool",
    () => editor?.getSelectedShapes() ?? [],
    [editor]
  ) as TLShape[];
  const selectedHtmlShape = selectedShapes.find((shape) =>
    getHtmlBoxDataFromShapeLike(shape)
  );

  useEffect(() => {
    updateMyPresence({ selection: selectedIds, isAgent: false });
  }, [selectedIds, updateMyPresence]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {!readonly && sidebarOpen ? (
        <LeftSidebar fileId={fileId} roomId={roomId} editor={editor} />
      ) : null}

      <div className="relative min-w-0 flex-1 bg-neutral-50">
        {!readonly ? (
          <Toolbar
            editor={editor}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            htmlToolOpen={htmlToolOpen}
            setHtmlToolOpen={setHtmlToolOpen}
          />
        ) : null}
        <div className="absolute right-4 top-4 z-30 flex items-center gap-3">
          <AvatarStack size={28} />
          <CopyPreviewButton fileId={fileId} />
        </div>
        {!readonly && selectedHtmlShape ? (
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
              <span className="text-xs font-medium text-neutral-700">HTML box selected</span>
              <button
                type="button"
                onClick={() => setHtmlToolOpen(true)}
                className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:border-neutral-300"
              >
                View code
              </button>
              <a
                href={`/files/readonly/${fileId}/${encodeURIComponent(selectedHtmlShape.id)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs hover:border-neutral-300"
              >
                <ExternalLink size={12} />
                Preview
              </a>
            </div>
          </div>
        ) : null}
        <Canvas readonly={readonly} onEditorMount={setEditor} />
      </div>
      {!readonly ? (
        <HtmlBoxDrawer
          fileId={fileId}
          selectedShapes={selectedShapes}
          open={htmlToolOpen}
          onClose={() => setHtmlToolOpen(false)}
        />
      ) : null}
    </div>
  );
}
