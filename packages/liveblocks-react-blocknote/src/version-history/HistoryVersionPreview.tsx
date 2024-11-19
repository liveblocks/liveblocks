import React from "react";

import type { BlockNoteEditor } from "@blocknote/core";
import { HistoryVersionPreview as TipTapHistoryVersionPreview } from "@liveblocks/react-tiptap";

type HistoryVersionPreviewProps = Omit<
  Parameters<typeof TipTapHistoryVersionPreview>[0],
  "editor"
> & {
  editor: BlockNoteEditor<any, any, any>;
};

export function HistoryVersionPreview(props: HistoryVersionPreviewProps) {
  return (
    <TipTapHistoryVersionPreview
      {...props}
      editor={props.editor._tiptapEditor}
    />
  );
}
