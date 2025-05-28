import type {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FloatingComposer as TipTapFloatingComposer } from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/core";

type FloatingComposerProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapFloatingComposer>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

export function FloatingComposer(props: FloatingComposerProps) {
  return (
    <TipTapFloatingComposer
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}
