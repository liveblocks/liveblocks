"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SettingSwitch({
  id,
  checked = false,
  disabled = false,
  onChange,
  children,
}: {
  id: string;
  checked?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {children}
      </Label>
    </div>
  );
}
