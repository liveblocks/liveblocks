"use client";

import clsx from "clsx";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getUser, getUsers } from "@/app/database";

export function UserMenu({
  userId,
  onUserChange,
}: {
  userId: string;
  onUserChange: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const users = getUsers();
  const currentUser = getUser(userId) ?? users[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-[var(--sidebar-bg-hover)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <img
          src={currentUser.info.avatar}
          alt=""
          className="size-7 shrink-0 rounded-md object-cover"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {currentUser.info.name}
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-[var(--sidebar-text-muted)]"
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-50 overflow-hidden rounded-lg border border-black/10 bg-white text-neutral-900 shadow-xl"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Switch user
          </div>
          {users.map((user) => {
            const selected = user.id === userId;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onUserChange(user.id);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-100",
                  selected && "bg-neutral-50"
                )}
              >
                <img
                  src={user.info.avatar}
                  alt=""
                  className="size-7 shrink-0 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {user.info.name}
                </span>
                {selected ? (
                  <CheckIcon className="size-4 shrink-0 text-[var(--sidebar-bg)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
