import type { BlockNoteEditor } from "@blocknote/core";
import { FloatingThreads as TipTapFloatingThreads } from "@liveblocks/react-tiptap";

type FloatingThreadsProps = Omit<
  Parameters<typeof TipTapFloatingThreads>[0],
  "editor"
> & {
  editor: BlockNoteEditor<any, any, any>;
};

export function FloatingThreads(props: FloatingThreadsProps) {
  return (
    <TipTapFloatingThreads {...props} editor={props.editor._tiptapEditor} />
  );
}
