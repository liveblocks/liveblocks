import type {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { HistoryVersionPreview as TipTapHistoryVersionPreview } from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/core";

type HistoryVersionPreviewProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapHistoryVersionPreview>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

export function HistoryVersionPreview(props: HistoryVersionPreviewProps) {
  return (
    <TipTapHistoryVersionPreview
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}
