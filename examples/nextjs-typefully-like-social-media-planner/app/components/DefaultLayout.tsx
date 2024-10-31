import { Notifications } from "./Notifications";
import { Logo } from "./Logo";
import { createRoom } from "../utils/liveblocks";
import { redirect } from "next/navigation";
import { CreateIcon } from "../icons/CreateIcon";
import { ReactNode } from "react";
import { getPageUrl } from "../config";
import { PageLinks } from "./PageLinks";
import { CreateWithAiLink } from "./CreateWithAiLink";

export default async function DefaultLayout({
  children,
}: {
  children: ReactNode;
}) {
  async function create() {
    "use server";

    const room = await createRoom();
    redirect(getPageUrl(room.id));
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
              <CreateIcon className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="p-2 flex flex-col gap-0.5">
          <Notifications />
          <CreateWithAiLink />
        </div>

        <div className="text-xs font-medium text-gray-500 mt-6 pl-2">Pages</div>

        <PageLinks />
      </div>

      <div className="relative flex flex-col h-full w-full">{children}</div>
    </div>
  );
}
