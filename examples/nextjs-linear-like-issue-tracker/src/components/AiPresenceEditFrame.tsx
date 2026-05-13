"use client";

import { useCallback, type ReactNode } from "react";
import { useOthers, shallow } from "@liveblocks/react";
import { AI_USER_INFO } from "@/database";
import type { AiEditingPresenceType } from "@/lib/ai-editing-presence-types";

type Props = {
  /** Must match strings the server puts in AI presence `editingTypes`. */
  editingType: AiEditingPresenceType;
  children: ReactNode;
};

/**
 * When the AI’s server presence lists this `editingType` in `editingTypes`,
 * draws a labeled outline so collaborators see what the assistant is editing.
 *
 * The DOM around `children` stays identical whether the chrome is visible or not,
 * so nested editors (e.g. Lexical) are not remounted when presence toggles.
 */
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
            ? "absolute -left-[3px] bottom-full z-[1] mb-px rounded-t-sm bg-indigo-500 px-1 py-0.5 text-[11px] font-semibold leading-none text-white"
            : "sr-only"
        }
      >
        {AI_USER_INFO.info.name}
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
