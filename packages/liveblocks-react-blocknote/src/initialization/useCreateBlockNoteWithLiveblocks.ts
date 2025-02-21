import type {
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { Mark } from "@tiptap/core";
import type { DependencyList } from "react";

import type { LiveblocksExtensionOptions } from "../BlockNoteLiveblocksExtension";
import { useLiveblocksExtension } from "../BlockNoteLiveblocksExtension";
import { withLiveblocksEditorOptions } from "./liveblocksEditorOptions";

/**
 * Function that can be used instead of standard useCreateBlockNote to add Liveblocks support
 */
export const useCreateBlockNoteWithLiveblocks = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  blocknoteOptions: Partial<BlockNoteEditorOptions<B, I, S>> = {},
  liveblocksOptions: LiveblocksExtensionOptions = {},
  deps: DependencyList = []
) => {
  const liveblocksExtension = useLiveblocksExtension(liveblocksOptions);
  return useCreateBlockNote(
    withLiveblocksEditorOptions(liveblocksExtension, blocknoteOptions),
    [liveblocksExtension, ...deps]
  );
};
