"use client";

import { Window } from "@/components/window";
import { COMPANIES, START_MONEY } from "@/game/constants";
import { companyBalance, formatMoney } from "@/game/economy";
import type { CompanyData, Vehicle } from "@/game/types";

type Props = {
  companies: ReadonlyMap<string, CompanyData>;
  vehicles: ReadonlyMap<string, Vehicle>;
  // Company id → name of the player running it right now
  managers: ReadonlyMap<string, string>;
  onPick: (companyId: string) => void;
};

// Shown when joining: every player picks one of the transport companies.
// Companies someone else is running at the moment can't be picked.
export function CompanyPicker({
  companies,
  vehicles,
  managers,
  onPick,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-2">
      <Window
        title="Choose your transport company"
        className="w-[26rem] max-w-full"
        canMinimize={false}
      >
        <p className="px-1 pt-2 pb-1.5">
          Pick a company to run. Each one has its own color on the map.
        </p>
        <ul className="win-inset flex flex-col">
          {COMPANIES.map((preset) => {
            const manager = managers.get(preset.id);
            const company = companies.get(preset.id);
            const owned = [...vehicles.values()].filter(
              (vehicle) => vehicle.owner === preset.id
            ).length;

            let status = `New company · ${formatMoney(START_MONEY)} to start with`;
            if (manager) {
              status = `Taken by ${manager}`;
            } else if (company) {
              const balance = companyBalance(
                company,
                vehicles.values(),
                preset.id
              );
              status = `Nobody at the wheel · ${formatMoney(balance)} · ${owned} ${
                owned === 1 ? "vehicle" : "vehicles"
              }`;
            }

            return (
              <li
                key={preset.id}
                className="flex items-center gap-2.5 border-b border-[#dfdfdf] px-2 py-1.5 last:border-b-0"
              >
                <span
                  className="size-6 shrink-0 border border-black"
                  style={{ background: preset.color }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-bold ${
                      manager ? "text-[#808080]" : ""
                    }`}
                  >
                    {preset.name}
                  </span>
                  <span
                    className={`block truncate ${
                      manager ? "text-[#c00000]" : "text-[#404040]"
                    }`}
                  >
                    {status}
                  </span>
                </span>
                <button
                  type="button"
                  className="win-button w-[5.5rem]"
                  disabled={manager !== undefined}
                  onClick={() => onPick(preset.id)}
                >
                  {manager ? "Taken" : company ? "Take over" : "Start"}
                </button>
              </li>
            );
          })}
        </ul>
      </Window>
    </div>
  );
}
