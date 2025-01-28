"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SettingSwitch({
  id,
  checked,
  children,
}: {
  id: string;
  checked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center">
      <Switch id={id} checked={checked} />
      <Label htmlFor={id} className="ml-3 text-sm font-medium text-gray-700">
        {children}
      </Label>
    </div>
  );
}
