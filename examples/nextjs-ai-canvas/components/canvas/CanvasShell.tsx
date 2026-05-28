"use client";

import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { useValue, type Editor } from "tldraw";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { AgentCursor } from "./AgentCursor";
import { Canvas } from "./Canvas";
import { CopyPreviewButton } from "./CopyPreviewButton";
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

  const selectedIds = useValue(
    "current-selected-shape-ids",
    () => editor?.getSelectedShapeIds() ?? [],
    [editor]
  );

  useEffect(() => {
    updateMyPresence({ selection: selectedIds, isAgent: false });
  }, [selectedIds, updateMyPresence]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {!readonly && sidebarOpen ? (
        <LeftSidebar fileId={fileId} roomId={roomId} editor={editor} />
      ) : null}

      <div className="relative min-w-0 flex-1 bg-white">
        {!readonly ? (
          <Toolbar
            editor={editor}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        ) : null}
        <CopyPreviewButton fileId={fileId} />
        <Canvas readonly={readonly} onEditorMount={setEditor} />
        <AgentCursor />
      </div>
    </div>
  );
}
