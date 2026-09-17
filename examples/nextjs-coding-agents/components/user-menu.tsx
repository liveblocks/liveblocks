"use client";

import clsx from "clsx";
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/app/providers";

export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const roleLabel =
    user.role === "member" ? "Team member" : "Viewer · read-only";

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
        aria-haspopup="menu"
        title={collapsed ? user.name : undefined}
      >
        <img
          src={user.avatar}
          alt=""
          className="size-7 shrink-0 rounded-md object-cover"
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {user.name}
              </span>
              <span className="block truncate text-[11px] text-subtle">
                {roleLabel}
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
          role="menu"
          className={clsx(
            "absolute z-50 w-60 overflow-hidden rounded-lg border border-border bg-background shadow-xl",
            collapsed
              ? "bottom-0 left-full ml-2"
              : "bottom-[calc(100%+4px)] left-0"
          )}
        >
          <div className="flex items-center gap-2.5 px-3 py-3">
            <img
              src={user.avatar}
              alt=""
              className="size-8 shrink-0 rounded-md object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">
                {user.name}
              </span>
              <span className="block truncate text-[11px] text-subtle">
                @{user.id}
              </span>
            </span>
          </div>
          <div className="border-t border-border p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut({ redirectTo: "/" })}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted transition hover:bg-panel-hover hover:text-foreground"
            >
              <LogOutIcon className="size-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
