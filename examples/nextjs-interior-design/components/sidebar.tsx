"use client";

import { useSelf } from "@liveblocks/react/suspense";
import { CheckIcon, ChevronsUpDownIcon, RotateCcwIcon } from "lucide-react";
import { memo } from "react";
import type { FurnitureType } from "@/lib/catalog";
import { PLANS, type Plan, type PlanId } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { HelpButton } from "./help-button";
import { Library } from "./library";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type SidebarProps = {
  plan: Plan;
  onPlanChange: (planId: PlanId) => void;
  onResetPlan: () => void;
  onAddFurniture: (type: FurnitureType) => void;
  onDropFurniture: (
    type: FurnitureType,
    clientX: number,
    clientY: number
  ) => void;
  getZoom: () => number;
  className?: string;
};

/**
 * The left column: which plan is open, the furniture library, and who you
 * are. Memoized so it sits still while the plan next to it is being edited.
 */
export const Sidebar = memo(function Sidebar({
  plan,
  onPlanChange,
  onResetPlan,
  onAddFurniture,
  onDropFurniture,
  getZoom,
  className,
}: SidebarProps) {
  const self = useSelf();

  return (
    <aside
      className={cn("flex w-[216px] shrink-0 flex-col lg:w-[272px]", className)}
    >
      <div className="px-2 pt-2.5 pb-3">
        <PlanSwitcher
          plan={plan}
          onChange={onPlanChange}
          onReset={onResetPlan}
        />
      </div>

      <Library
        onAdd={onAddFurniture}
        onDrop={onDropFurniture}
        getZoom={getZoom}
      />

      <div className="flex items-center gap-2.5 border-t border-line px-3 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={self.info.avatar}
          alt=""
          className="size-8 shrink-0 rounded-full bg-hover object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
            {self.info.name}
          </div>
          <div className="truncate text-xs text-ink-muted">
            {self.info.title}
          </div>
        </div>
        <HelpButton />
      </div>
    </aside>
  );
});

function PlanSwitcher({
  plan,
  onChange,
  onReset,
}: {
  plan: Plan;
  onChange: (planId: PlanId) => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors outline-none hover:bg-ink/8 focus-visible:bg-ink/8 data-[state=open]:bg-ink/8"
        aria-label={`Plan: ${plan.name}`}
      >
        <LiveblocksMark />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] leading-tight font-medium text-ink">
            {plan.name}
          </div>
          <div className="truncate text-[11px] leading-tight text-ink-muted">
            {plan.description}
          </div>
        </div>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-ink-faint group-hover:text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {PLANS.map((item) => {
          const active = item.id === plan.id;
          return (
            <DropdownMenuItem
              key={item.id}
              className="h-auto py-1.5 text-[13px]"
              onClick={() => onChange(item.id)}
              aria-current={active ? "true" : undefined}
            >
              <div className="min-w-0 flex-1 pl-0.5">
                <div className="truncate">{item.name}</div>
                <div className="truncate text-[11px] text-ink-muted">
                  {item.description}
                </div>
              </div>
              {active ? (
                <CheckIcon className="size-3.5 shrink-0 text-ink" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[13px]" onClick={onReset}>
          <RotateCcwIcon className="size-3.5" />
          Reset this plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LiveblocksMark() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-ink text-surface"
      aria-hidden
    >
      <svg viewBox="768 320 264 160" fill="currentColor" className="size-5">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M954 320H768L821 376V453L954 320ZM847 480H1032L979 424V347L847 480Z"
        />
      </svg>
    </span>
  );
}
