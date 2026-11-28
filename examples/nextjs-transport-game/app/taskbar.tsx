"use client";

import { AvatarStack } from "@liveblocks/react-ui";
import { HelpButton } from "@/components/help-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney } from "@/game/economy";
import type { CompanyData } from "@/game/types";

export type OpenWindows = {
  companies: boolean;
  vehicles: boolean;
  cargo: boolean;
  stats: boolean;
  theme: boolean;
};

type Props = {
  hint: string;
  company: CompanyData | undefined;
  balance: number;
  open: OpenWindows;
  onToggle: (name: keyof OpenWindows) => void;
  onSwitchCompany: () => void;
};

// The bar along the bottom of the screen: buttons to bring windows back, a
// line about what's under the cursor, and the player's company and money
export function Taskbar({
  hint,
  company,
  balance,
  open,
  onToggle,
  onSwitchCompany,
}: Props) {
  return (
    <div className="win pointer-events-auto absolute right-2 bottom-2 left-2 z-[5] flex items-center gap-1">
      <button
        type="button"
        className="win-button font-bold"
        aria-pressed={open.companies}
        onClick={() => onToggle("companies")}
      >
        <span>Companies</span>
      </button>
      <button
        type="button"
        className="win-button font-bold max-sm:hidden"
        aria-pressed={open.vehicles}
        disabled={!company}
        onClick={() => onToggle("vehicles")}
      >
        <span>Vehicles</span>
      </button>
      <button
        type="button"
        className="win-button font-bold max-sm:hidden"
        aria-pressed={open.cargo}
        onClick={() => onToggle("cargo")}
      >
        <span>Cargo</span>
      </button>
      <button
        type="button"
        className="win-button font-bold max-sm:hidden"
        aria-pressed={open.stats}
        onClick={() => onToggle("stats")}
      >
        <span>Stats</span>
      </button>
      <button
        type="button"
        className="win-button font-bold max-sm:hidden"
        aria-pressed={open.theme}
        onClick={() => onToggle("theme")}
      >
        <span>Theme</span>
      </button>
      <div className="win-divider" />

      <div className="win-status min-w-0 flex-1 truncate">{hint}</div>

      {company ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="win-button max-md:hidden"
                onClick={onSwitchCompany}
              >
                <span
                  className="size-3 shrink-0 border border-ui-edge"
                  style={{ background: company.color }}
                />
                <span>{company.name}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              Switch to another company
            </TooltipContent>
          </Tooltip>
          <div
            className={`win-status font-bold tabular-nums ${
              balance < 0 ? "text-ui-bad" : ""
            }`}
          >
            {formatMoney(balance)}
          </div>
        </>
      ) : null}

      <div className="win-divider" />
      {/* Everyone who is in the room right now */}
      <AvatarStack size={22} max={6} />
      <HelpButton />
    </div>
  );
}
