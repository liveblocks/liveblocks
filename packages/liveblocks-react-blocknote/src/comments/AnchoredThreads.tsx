import React from "react";

import type { BlockNoteEditor } from "@blocknote/core";
import { AnchoredThreads as TipTapAnchoredThreads } from "@liveblocks/react-tiptap";

type AnchoredThreadsProps = Omit<
  Parameters<typeof TipTapAnchoredThreads>[0],
  "editor"
> & {
  editor: BlockNoteEditor<any, any, any>;
};

export function AnchoredThreads(props: AnchoredThreadsProps) {
  return (
    <TipTapAnchoredThreads {...props} editor={props.editor._tiptapEditor} />
  );
}
