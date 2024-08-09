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
import { ComponentProps, useState } from "react";
import { Loading } from "@/components/Loading";

export function Nav() {
  const { isOpen, toggleInbox } = useInbox();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      {creating ? (
        <div className="inset-0 bg-neutral-100/50 fixed z-50">
          <Loading />
        </div>
      ) : null}
      <div className="text-sm font-semibold p-2 pr-0 flex justify-between items-center mb-2">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="w-4 text-gray-600">
            <Logo />
          </span>
          Liveblocks
        </Link>
        <button
          onClick={() => {
            setCreating(true);
            createIssue();
          }}
          className="bg-white rounded-lg p-1.5 shadow-sm border border-neutral-200 text"
        >
          <Create className="w-4 h-4" />
        </button>
      </div>
      {pathname.startsWith("/issue/") ? (
        <button
          onClick={toggleInbox}
          className={classNames(
            "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left hover:bg-neutral-200",
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
              "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left hover:bg-neutral-200",
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
    <div className="w-5 h-5 flex justify-center items-center bg-neutral-200 font-medium text-xs rounded">
      {count}
    </div>
  );
}

function Logo(props: ComponentProps<"svg">) {
  return (
    <svg
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="30 30 68 68"
      fill="none"
      {...props}
    >
      <g
        fill="#000"
        fillRule="evenodd"
        clipRule="evenodd"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "rotate var(--duration) infinite var(--ease-in-out-expo)",
        }}
      >
        <path
          d="M96 83H51l32.05-32v18.56L96 83z"
          style={{
            transformOrigin: "73.5px 67px",
            animation:
              "offset-distance var(--duration) infinite var(--ease-in-out-quart),offset-rotate var(--duration) infinite var(--ease-in-out-expo)",
          }}
        />
        <path
          d="M32 45h45L44.95 77V58.44L32 45z"
          style={{
            transformOrigin: "54.5px 61px",
            animation:
              "offset-distance var(--duration) infinite var(--ease-in-out-quart),offset-rotate var(--duration) infinite var(--ease-in-out-expo)",
          }}
        />
      </g>
    </svg>
  );
}
