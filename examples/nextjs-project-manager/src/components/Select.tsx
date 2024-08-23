import React, { ReactNode } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import classnames from "classnames";
import { ChevronUp } from "@/icons/ChevronUp";
import { ChevronDown } from "@/icons/ChevronDown";
import { Check } from "@/icons/Check";

type Props = {
  id: string;
  value: string;
  items: { id: string; jsx: ReactNode; text?: string }[];
  splitFirstItem?: boolean;
  onValueChange: (value: string) => void;
};

export function Select({
  id,
  onValueChange,
  value,
  items,
  splitFirstItem = false,
}: Props) {
  const [firstItem, ...otherItems] = items;
  const itemList = splitFirstItem ? otherItems : items;

  const current = items.find((item) => item.id === value);

  return (
    <RadixSelect.Root onValueChange={onValueChange} value={value}>
      <RadixSelect.Trigger
        aria-label={id}
        className="flex items-center justify-between bg-transparent border-0 h-7 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200/60 appearance-none data-[state=open]:bg-neutral-200/60"
      >
        {current ? current.text || current.jsx : <RadixSelect.Value />}
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={5}
          className="overflow-hidden bg-white rounded-lg border border-neutral-200 shadow relative right-full -top-8 -mt-0.5 mr-1"
        >
          <RadixSelect.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white cursor-default">
            <ChevronUp className="w-4 h-4" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport>
            {splitFirstItem ? (
              <RadixSelect.Group className="border-b p-1">
                <RadixSelect.Item
                  key={firstItem.id}
                  value={firstItem.id}
                  className={classnames(
                    "text-sm leading-none flex items-center h-7 pr-8 pl-2 relative select-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none hover:bg-neutral-200/60 rounded"
                  )}
                >
                  <RadixSelect.ItemText>{firstItem.jsx}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-0 w-[25px] inline-flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              </RadixSelect.Group>
            ) : null}
            <RadixSelect.Group className="p-1">
              {itemList.map((item) => (
                <RadixSelect.Item
                  key={item.id}
                  value={item.id}
                  className={classnames(
                    "text-sm leading-none flex items-center h-7 pr-8 pl-2 relative select-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none hover:bg-neutral-200/60 rounded"
                  )}
                >
                  <RadixSelect.ItemText>{item.jsx}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-0 w-[25px] inline-flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Group>
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white cursor-default">
            <ChevronDown className="w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
