"use client";

import React from "react";
import { useScenario, Scenario } from "@/hooks/useScenario";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon } from "@radix-ui/react-icons";

const scenarios: { value: Scenario; label: string }[] = [
  { value: 'auth-hidden', label: 'Auth user (hidden comments)' },
  { value: 'anonymous', label: 'Anonymous user' },
  { value: 'auth-visible', label: 'Auth user (all features)' },
];

export function ScenarioMenu() {
  const { scenario, updateScenario, isLoaded } = useScenario();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
      <div className="bg-surface-elevated border border-border rounded-sm shadow-xl p-3">
        <div className="text-sm font-medium text-text-light mb-2">Scenario</div>
        <Select.Root value={scenario} onValueChange={updateScenario}>
          <Select.Trigger className="flex items-center justify-between w-48 px-3 py-2 text-sm bg-surface border border-border rounded-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/20">
            <Select.Value />
            <Select.Icon>
              <ChevronDownIcon className="w-4 h-4" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-surface-elevated border border-border rounded-sm shadow-xl overflow-hidden">
              <Select.Viewport>
                {scenarios.map((item) => (
                  <Select.Item
                    key={item.value}
                    value={item.value}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-surface focus:bg-surface focus:outline-none"
                  >
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </div>
  );
}
