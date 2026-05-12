import { CmsEditor } from "./CmsEditor";
import { EditorHeaderAvatars } from "./EditorHeaderAvatars";
import { EditorHeaderTitle } from "./EditorHeaderTitle";

export function PostShell({ postId }: { postId: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <EditorHeaderTitle />
        </div>
        <EditorHeaderAvatars />
      </header>
      <CmsEditor postId={postId} />
    </div>
  );
}
