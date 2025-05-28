import type {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { AnchoredThreads as TipTapAnchoredThreads } from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/core";

type AnchoredThreadsProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapAnchoredThreads>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

export function AnchoredThreads(props: AnchoredThreadsProps) {
  return (
    <TipTapAnchoredThreads
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}
