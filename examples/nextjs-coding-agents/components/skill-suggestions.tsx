"use client";

import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import clsx from "clsx";
import { SlashIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { Skill } from "@/lib/skills";

export type SkillSuggestionsRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

type SkillSuggestionsProps = SuggestionProps<
  Skill,
  { id: string; label: string }
>;

export const SkillSuggestions = forwardRef<
  SkillSuggestionsRef,
  SkillSuggestionsProps
>(function SkillSuggestions(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = props.items;

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const select = (skill: Skill | undefined) => {
    if (skill) {
      props.command({ id: skill.id, label: skill.name });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((index) =>
          items.length === 0 ? 0 : (index + items.length - 1) % items.length
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((index) =>
          items.length === 0 ? 0 : (index + 1) % items.length
        );
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        select(items[selectedIndex]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-lg border border-border bg-background p-3 text-xs text-muted shadow-lg">
        No matching skills
      </div>
    );
  }

  return (
    <div className="max-h-72 w-80 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg">
      <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium text-subtle">
        Skills
      </div>
      {items.map((skill, index) => (
        <button
          key={skill.id}
          type="button"
          className={clsx(
            "flex w-full items-start gap-2.5 px-3 py-1.5 text-left",
            index === selectedIndex ? "bg-panel-active" : "hover:bg-panel-hover"
          )}
          onMouseEnter={() => setSelectedIndex(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            select(skill);
          }}
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-accent-soft text-accent-foreground">
            <SlashIcon className="size-3" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium">{skill.name}</span>
              <span className="font-mono text-[11px] text-subtle">
                /{skill.id}
              </span>
            </span>
            <span className="block truncate text-xs text-muted">
              {skill.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});
