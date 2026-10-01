"use client";

import clsx from "clsx";
import { CheckIcon } from "lucide-react";
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
    <div ref={containerRef} className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="block size-9 overflow-hidden rounded-lg ring-2 ring-transparent transition hover:ring-white/40"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Signed in as ${currentUser.info.name}. Switch user`}
        title={currentUser.info.name}
      >
        <img
          src={currentUser.info.avatar}
          alt=""
          className="size-full object-cover"
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute bottom-0 left-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-lg border border-black/10 bg-white text-neutral-900 shadow-xl"
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
                <span className="inline-block size-7 min-h-7 min-w-7 shrink-0 overflow-hidden rounded-md">
                  <img
                    src={user.info.avatar}
                    alt=""
                    className="size-full object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {user.info.name}
                </span>
                {selected ? (
                  <CheckIcon className="size-4 shrink-0 text-sidebar" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
