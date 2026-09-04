"use client";

import clsx from "clsx";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getUser, getUsers } from "@/app/database";
import { useCurrentUser } from "@/app/providers";

export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { userId, setUserId } = useCurrentUser();
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
        className={clsx(
          "flex w-full items-center gap-2 rounded-md text-left transition hover:bg-panel-hover",
          collapsed ? "justify-center p-1" : "px-1.5 py-1.5"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={collapsed ? `${currentUser.info.name} (switch user)` : undefined}
      >
        <img
          src={currentUser.info.avatar}
          alt=""
          className="size-7 shrink-0 rounded-md object-cover"
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {currentUser.info.name}
              </span>
              <span className="block truncate text-[11px] text-subtle">
                Switch demo user
              </span>
            </span>
            <ChevronsUpDownIcon
              className="size-3.5 shrink-0 text-subtle"
              aria-hidden
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          role="listbox"
          className={clsx(
            "absolute z-50 w-60 overflow-hidden rounded-lg border border-border bg-background shadow-xl",
            collapsed
              ? "bottom-0 left-full ml-2"
              : "bottom-[calc(100%+4px)] left-0"
          )}
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
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
                  setUserId(user.id);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-panel-hover",
                  selected && "bg-panel"
                )}
              >
                <img
                  src={user.info.avatar}
                  alt=""
                  className="size-6 shrink-0 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {user.info.name}
                </span>
                {selected ? (
                  <CheckIcon className="size-4 shrink-0 text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
