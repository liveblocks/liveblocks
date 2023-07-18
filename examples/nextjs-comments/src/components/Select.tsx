import type {
  SelectItemProps as RadixSelectItemProps,
  SelectProps as RadixSelectProps,
} from "@radix-ui/react-select";
import * as RadixSelect from "@radix-ui/react-select";
import clsx from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

export type SelectOption<T extends string = string> = {
  label: ReactNode;
  value: T;
};

interface SelectProps extends RadixSelectProps {
  options: SelectOption[];
}

interface SelectItemProps extends RadixSelectItemProps {
  value: string;
}

function SelectItem({ children, value, className, ...props }: SelectItemProps) {
  return (
    <RadixSelect.Item
      value={value}
      className={clsx(
        className,
        "relative flex flex-none cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium outline-none focus:bg-gray-100"
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator>
        <Check className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

export function Select({ children, options, ...props }: SelectProps) {
  return (
    <RadixSelect.Root {...props}>
      <RadixSelect.Trigger asChild>{children}</RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 rounded-lg bg-white shadow-xl">
          <RadixSelect.Viewport className="p-1">
            {options.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.Arrow />
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
