"use client";

import Link from "next/link";
import { createIssue } from "@/actions/liveblocks";
import { useInbox } from "@/components/InboxContext";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { Create } from "@/icons/Create";
import { InboxIcon } from "@/icons/Inbox";
import {
  ClientSideSuspense,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";

export function Nav() {
  const { isOpen, toggleInbox } = useInbox();
  const pathname = usePathname();

  return (
    <div>
      <div className="text-sm font-semibold p-2 pr-0 flex justify-between items-center mb-2">
        <Link href="/">Liveblocks</Link>
        <button
          onClick={() => createIssue()}
          className="bg-white rounded-lg p-1.5 shadow-sm border border-neutral-200 text"
        >
          <Create className="w-4 h-4" />
        </button>
      </div>
      {pathname.startsWith("/issue/") ? (
        <button
          onClick={toggleInbox}
          className={classNames(
            "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left",
            { "bg-neutral-200": isOpen }
          )}
        >
          <span className="flex items-center gap-2">
            <InboxIcon className="w-4 h-4" />
            Inbox
          </span>
          <ClientSideSuspense fallback={<div />}>
            <UnreadBadge />
          </ClientSideSuspense>
        </button>
      ) : (
        <Link href="/inbox">
          <div
            className={classNames(
              "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left",
              { "bg-neutral-200": pathname === "/inbox" }
            )}
          >
            <span className="flex items-center gap-2">
              <InboxIcon className="w-4 h-4" />
              Inbox
            </span>
            <ClientSideSuspense fallback={<div />}>
              <UnreadBadge />
            </ClientSideSuspense>
          </div>
        </Link>
      )}
    </div>
  );
}

function UnreadBadge() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) {
    return <div />;
  }

  return (
    <div className="w-5 h-5 flex justify-center items-center bg-neutral-200 font-normal text-xs rounded">
      {count}
    </div>
  );
}
