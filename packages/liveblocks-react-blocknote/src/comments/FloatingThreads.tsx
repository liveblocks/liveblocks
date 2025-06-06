import type {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FloatingThreads as TipTapFloatingThreads } from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/core";

type FloatingThreadsProps<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = Omit<Parameters<typeof TipTapFloatingThreads>[0], "editor"> & {
  editor: BlockNoteEditor<B, I, S>;
};

export function FloatingThreads(props: FloatingThreadsProps) {
  return (
    <TipTapFloatingThreads
      {...props}
      editor={props.editor._tiptapEditor as unknown as Editor}
    />
  );
}
