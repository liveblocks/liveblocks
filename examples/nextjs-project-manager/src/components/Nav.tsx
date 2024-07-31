"use client";

import Link from "next/link";
import { createIssue } from "@/actions/liveblocks";
import { useInbox } from "@/components/InboxContext";
import classNames from "classnames";

export function Nav() {
  const { isOpen, toggleInbox } = useInbox();

  return (
    <div>
      <div className="text-sm font-semibold p-2 flex justify-between items-center mb-2">
        <Link href="/">Liveblocks</Link>
        <button
          onClick={() => createIssue()}
          className="bg-white rounded px-2 py-0.5 shadow-sm border border-neutral-200 text"
        >
          + New
        </button>
      </div>
      <button
        onClick={toggleInbox}
        className={classNames(
          "block w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left",
          { "bg-neutral-200": isOpen }
        )}
      >
        Inbox
      </button>
    </div>
  );
}
