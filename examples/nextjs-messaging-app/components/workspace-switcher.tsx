"use client";

import clsx from "clsx";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WORKSPACES } from "@/lib/workspaces";

export function WorkspaceSwitcher({
  workspaceId,
  onWorkspaceChange,
}: {
  workspaceId: string;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWorkspace =
    WORKSPACES.find((workspace) => workspace.id === workspaceId) ??
    WORKSPACES[0];

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
        className="flex size-10 items-center justify-center rounded-lg bg-white/15 text-base font-bold text-white transition hover:bg-white/25"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Workspace: ${activeWorkspace.name}`}
        title={activeWorkspace.name}
      >
        {activeWorkspace.name.slice(0, 1)}
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-[calc(100%+8px)] top-0 z-50 w-56 overflow-hidden rounded-md border border-black/10 bg-white text-neutral-900 shadow-xl"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Switch workspace
          </div>
          {WORKSPACES.map((workspace) => {
            const selected = workspace.id === workspaceId;
            return (
              <button
                key={workspace.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onWorkspaceChange(workspace.id);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-neutral-100",
                  selected && "bg-neutral-50"
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
                  style={{ backgroundColor: workspace.theme.sidebar }}
                >
                  {workspace.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {workspace.name}
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
