import React from "react";

import type { BlockNoteEditor } from "@blocknote/core";
import { FloatingComposer as TipTapFloatingComposer } from "@liveblocks/react-tiptap";

type FloatingComposerProps = Omit<
  Parameters<typeof TipTapFloatingComposer>[0],
  "editor"
> & {
  editor: BlockNoteEditor<any, any, any>;
};

export function FloatingComposer(props: FloatingComposerProps) {
  return (
    <TipTapFloatingComposer {...props} editor={props.editor._tiptapEditor} />
  );
}
