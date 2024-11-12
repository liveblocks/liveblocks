import { useThreads } from "@liveblocks/react/suspense";
import { AnchoredThreads, FloatingThreads } from "@liveblocks/react-tiptap";
import { useEditor } from "novel";

export function Threads() {
  const { editor } = useEditor();
  const { threads } = useThreads({ query: { resolved: false } });

  if (!editor) {
    return null;
  }

  return (
    <>
      <FloatingThreads
        threads={threads}
        editor={editor}
        className="w-[350px] block md:hidden"
      />
      <AnchoredThreads
        threads={threads}
        editor={editor}
        className="w-[350px] hidden sm:block"
      />
    </>
  );
}
