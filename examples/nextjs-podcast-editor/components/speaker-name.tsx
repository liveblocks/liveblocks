"use client";

import { useMutation } from "@liveblocks/react/suspense";
import { useState, type ReactNode } from "react";
import { getSpeaker } from "@/lib/transcript";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useEditor } from "./editor-context";

/**
 * A speaker's name that opens a small rename form. Renames are stored in
 * Storage, so every paragraph, the sidebar, and everyone else update at once.
 */
export function SpeakerName({
  speakerId,
  className,
  children,
}: {
  speakerId: string;
  className?: string;
  children?: ReactNode;
}) {
  const { speakerName } = useEditor();
  const name = speakerName(speakerId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);

  const rename = useMutation(
    ({ storage }, next: string) => {
      const trimmed = next.trim();
      if (!trimmed || trimmed === getSpeaker(speakerId).name) {
        storage.get("speakerNames").delete(speakerId);
      } else {
        storage.get("speakerNames").set(speakerId, trimmed);
      }
    },
    [speakerId]
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValue(name);
        }
      }}
    >
      <PopoverTrigger className={className} title="Rename speaker">
        {children ?? name}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            rename(value);
            setOpen(false);
          }}
        >
          <label className="text-xs font-medium text-neutral-500">
            Speaker name
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1.5 h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-[3px] focus:ring-ring"
            />
          </label>
          <p className="mt-2 text-xs text-neutral-500">
            Renames every paragraph they speak in.
          </p>
        </form>
      </PopoverContent>
    </Popover>
  );
}
