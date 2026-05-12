import { ReactNode } from "react";
import { createRoom } from "../utils/liveblocks";
import { redirect } from "next/navigation";
import { getPostUrl } from "../config";
import { PostLinks } from "./PostLinks";

export default async function DefaultLayout({
  children,
}: {
  children: ReactNode;
}) {
  async function create() {
    "use server";

    const room = await createRoom();
    redirect(getPostUrl(room.metadata.postId));
  }

  return (
    <div className="flex h-full max-h-full">
      <aside className="flex h-full w-[260px] flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-3">
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            Posts
          </span>
          <form action={create}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              New post
            </button>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <PostLinks />
        </div>
      </aside>

      <div className="relative flex h-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
