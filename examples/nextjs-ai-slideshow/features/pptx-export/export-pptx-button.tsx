"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportDeckToPptx } from "./export-pptx";

export function ExportPptxButton() {
  const room = useRoom();
  const [exporting, setExporting] = useState(false);

  const exportPptx = useCallback(async () => {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      await exportDeckToPptx(getYjsProviderForRoom(room).getYDoc());
    } finally {
      setExporting(false);
    }
  }, [exporting, room]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPptx}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <DownloadIcon className="size-4" />
      )}
      Download .pptx
    </Button>
  );
}
