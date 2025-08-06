"use client";

import React from "react";
import { useScenario, Scenario } from "@/hooks/useScenario";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon } from "@radix-ui/react-icons";

const scenarios: { value: Scenario; label: string }[] = [
  { value: "auth-visible", label: "Authenticated user" },
  { value: "auth-hidden", label: "Authenticated user (can't see comments)" },
  { value: "anonymous", label: "Anonymous user (read everything)" },
];

export function ScenarioMenu() {
  const { scenario, updateScenario, isLoaded } = useScenario();

  if (!isLoaded) {
    return null;
  }

  return (
    <Select.Root value={scenario} onValueChange={updateScenario}>
      <Select.Trigger className="flex items-center justify-between px-3 py-2 text-sm bg-surface border rounded-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/20">
        <Select.Value />
        <Select.Icon>
          <ChevronDownIcon className="w-4 h-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 bg-surface-elevated border rounded-sm shadow-xl overflow-hidden">
          <Select.Viewport>
            {scenarios.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="bg-white px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
