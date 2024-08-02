import * as RadixSelect from "@radix-ui/react-select";
import cx from "classnames";
import type { ComponentProps, ReactNode } from "react";

import { Tooltip } from "./Tooltip";

export interface SelectItem
  extends Omit<ComponentProps<typeof RadixSelect.SelectItem>, "content"> {
  value: string;
  content?: ReactNode;
}

interface Props extends ComponentProps<typeof RadixSelect.Trigger> {
  defaultValue?: RadixSelect.SelectProps["defaultValue"];
  value?: RadixSelect.SelectProps["value"];
  onValueChange?: RadixSelect.SelectProps["onValueChange"];
  items: SelectItem[];
  description: string;
}

export function Select({
  items,
  onValueChange,
  defaultValue,
  value,
  className,
  description,
  children,
  ...props
}: Props) {
  return (
    <RadixSelect.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
    >
      <Tooltip content={description} sideOffset={10}>
        <RadixSelect.Trigger
          className={cx(
            className,
            "text-dark-600 hover:text-dark-0 focus-visible:text-dark-0 dark:text-light-600 dark:hover:text-light-0 dark:focus-visible:text-light-0 flex h-5 min-w-0 items-center pr-1.5 pl-1"
          )}
          aria-label={description}
          {...props}
        >
          <span className="truncate">{children ?? <RadixSelect.Value />}</span>
          <RadixSelect.Icon className="ml-1 block">
            <svg
              width="9"
              height="6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="translate-y-px opacity-50"
            >
              <path
                d="m1 1 3.5 3.5L8 1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
      </Tooltip>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="bg-light-0 text-dark-400 dark:text-light-0 dark:bg-dark-100 dark:border-dark-300 border-light-300 rounded-lg border p-1"
          position="popper"
          alignOffset={-24}
          sideOffset={10}
        >
          <RadixSelect.Viewport>
            {items.map((item) => (
              <RadixSelect.Item
                value={item.value}
                key={item.value}
                className={cx(
                  "data-[highlighted]:text-light-0 dark:data-[highlighted]:text-dark-0 data-[highlighted]:bg-brand-500 dark:data-[highlighted]:bg-brand-400 relative flex cursor-pointer items-center rounded py-0.5 pr-1.5 pl-6"
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-1">
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="m12 5-5.5 6L4 8.273"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </RadixSelect.ItemIndicator>
                {item.content ?? (
                  <RadixSelect.ItemText>{item.value}</RadixSelect.ItemText>
                )}
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
