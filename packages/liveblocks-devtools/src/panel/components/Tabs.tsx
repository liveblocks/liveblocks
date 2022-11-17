import * as RadixTabs from "@radix-ui/react-tabs";
import cx from "classnames";
import type { ComponentProps, ReactNode } from "react";

interface Tab extends ComponentProps<typeof RadixTabs.Trigger> {
  value: string;
  title: string;
  content: ReactNode;
}

interface TabsProps extends RadixTabs.TabsProps {
  tabs: Tab[];
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function Tabs({
  tabs,
  className,
  leading,
  trailing,
  ...props
}: TabsProps) {
  return (
    <RadixTabs.Root className={cx(className, "flex flex-col")} {...props}>
      <div className="flex h-8 border-b border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
        {leading ?? null}
        <RadixTabs.List className="flex h-full flex-1 overflow-x-auto px-1.5 text-gray-600 dark:text-gray-400">
          {tabs.map((tab) => (
            <RadixTabs.Trigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className={cx(
                "relative flex items-center px-2 font-medium text-gray-400",
                "enabled:hover:text-gray-500 enabled:focus-visible:text-gray-500 disabled:opacity-50 enabled:[&[data-state='active']]:text-gray-800",
                "dark:text-gray-500 dark:enabled:hover:text-gray-400 dark:enabled:focus-visible:text-gray-400 dark:enabled:[&[data-state='active']]:text-gray-100"
              )}
            >
              {tab.title}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>
        {trailing ?? null}
      </div>
      {tabs.map((tab) => (
        <RadixTabs.Content
          key={tab.value}
          value={tab.value}
          className="relative flex-1"
        >
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
