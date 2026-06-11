import type {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  HistoryVersionPreview as TipTapHistoryVersionPreview,
  YjsVersionPreview as TipTapYjsVersionPreview,
} from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/core";

type YjsVersionPreviewProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapYjsVersionPreview>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

export function YjsVersionPreview(props: YjsVersionPreviewProps) {
  return (
    <TipTapYjsVersionPreview
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}

/**
 * @deprecated Use {@link YjsVersionPreview} instead.
 */
type HistoryVersionPreviewProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapHistoryVersionPreview>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

/**
 * @deprecated Use {@link YjsVersionPreview} instead.
 */
export function HistoryVersionPreview(props: HistoryVersionPreviewProps) {
  return (
    <TipTapHistoryVersionPreview
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}
