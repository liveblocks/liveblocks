"use client";

import { useCallback, type ReactNode } from "react";
import { useOthers, shallow } from "@liveblocks/react";
import { AI_USER_INFO } from "@/database";
import { SparklesIcon } from "@/icons/SparklesIcon";
import type { AiEditingPresenceType } from "@/lib/ai-editing-presence-types";

type Props = {
  editingType: AiEditingPresenceType;
  children: ReactNode;
};

// Draws an AI presence box if the `editingType` is help in AI presence
export function AiPresenceEditFrame({ editingType, children }: Props) {
  const selector = useCallback(
    (others: readonly { id: string; presence: { editingTypes?: string[] } }[]) => {
      const ai = others.find((o) => o.id === AI_USER_INFO.id);
      const editingTypes = ai?.presence?.editingTypes;
      return (
        Array.isArray(editingTypes) && editingTypes.includes(editingType)
      );
    },
    [editingType]
  );

  const active = useOthers(selector, shallow);

  return (
    <div className="relative rounded-md">
      <span
        className={
          active
            ? "absolute -left-[3px] bottom-full z-[1] mb-px inline-flex items-center gap-0.5 rounded-t-sm bg-indigo-500 px-1 py-[3px] text-[11px] font-semibold leading-none text-white max-w-full"
            : "sr-only"
        }
      >
        <SparklesIcon className="h-2.5 w-2.5 shrink-0 opacity-95" />
        <span className="truncate">{AI_USER_INFO.info.name}</span>
      </span>
      <div
        className={
          active
            ? "rounded-sm rounded-tl-none ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-50"
            : "rounded-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}
