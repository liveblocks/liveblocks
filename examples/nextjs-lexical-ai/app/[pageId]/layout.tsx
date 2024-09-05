import { Editor } from "../components/Editor";
import { Room } from "../Room";
import { Notifications } from "../components/Notifications";
import { Avatars } from "../components/Avatars";
import { Logo } from "../components/Logo";
import {
  createPage,
  getPages,
  getPageTitle,
  TypedRoomData,
} from "../lib/liveblocks";
import { redirect } from "next/navigation";
import { CreateIcon } from "../icons/CreateIcon";
import { ReactNode, Suspense } from "react";
import { TrashIcon } from "../icons/TrashIcon";
import Link from "next/link";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
// export const dynamic = "force-dynamic";
// export const maxDuration = 30;
// export const revalidate = 0;

export default async function Page({ children }: { children: ReactNode }) {
  const pages = await getPages();
  async function create() {
    "use server";

    const room = await createPage();
    redirect(`/${room.metadata.pageId}`);
  }
  return (
    <div className="flex h-full max-h-full">
      <div className="w-[240px] h-full bg-gray-50 border-r border-gray-100 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between p-3">
          <div className="w-28 text-black">
            <Logo />
          </div>
          <form action={create} className="flex items-center">
            <button>
              <span className="sr-only">Create new page</span>
              <CreateIcon className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="p-2">
          <Notifications />
        </div>

        <div className="text-sm font-medium text-gray-500 mt-6 pl-2">Pages</div>
        <div className="overflow-y-auto p-2">
          {pages.map((page) => (
            <Suspense key={page.id} fallback={<div />}>
              <PageLink page={page} />
            </Suspense>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col h-full w-full">{children}</div>
    </div>
  );
}

async function PageLink({ page }: { page: TypedRoomData }) {
  const title = await getPageTitle(page.metadata.pageId);

  return (
    <div className="flex justify-between items-center hover:bg-gray-200 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2">
      <Link
        href={`/${page.metadata.pageId}`}
        className="py-1 px-3 flex-1  truncate"
      >
        {title}
      </Link>
      <button>
        <span className="sr-only">Delete page</span>
        <TrashIcon className="w-4 h-4 text-red-400" />
      </button>
    </div>
  );
}
