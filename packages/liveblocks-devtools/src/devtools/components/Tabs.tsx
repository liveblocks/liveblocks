import * as RadixTabs from "@radix-ui/react-tabs";
import cx from "classnames";
import type { ComponentProps, ReactNode } from "react";

import { Tooltip } from "./Tooltip";

export interface Tab
  extends Omit<ComponentProps<typeof RadixTabs.Trigger>, "content"> {
  value: string;
  title: string;
  richTitle?: ReactNode;
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
      <div className="border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 flex h-8 border-b">
        {leading ?? null}
        <RadixTabs.List className="scrollbar-hidden flex h-full flex-1 overflow-x-auto px-1.5">
          {tabs.map((tab) => {
            const content = (
              <RadixTabs.Trigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className={cx(
                  "relative flex items-center px-2",
                  "text-dark-600 enabled:hover:text-dark-400 enabled:focus-visible:text-dark-400 disabled:opacity-50",
                  "data-[state=active]:!text-dark-0 data-[state=active]:font-medium",
                  "dark:enabled:hover:text-light-400 dark:enabled:focus-visible:text-light-400 dark:data-[state=active]:!text-light-0 dark:text-light-600"
                )}
              >
                <span
                  className={cx(
                    "inline-block text-center",
                    "before:invisible before:block before:h-0 before:overflow-hidden before:font-medium before:content-[attr(data-title)]"
                  )}
                  data-title={tab.title}
                >
                  {tab.richTitle ?? tab.title}
                </span>
              </RadixTabs.Trigger>
            );

            return tab.disabled ? (
              <Tooltip
                key={tab.value}
                content="Not available yet"
                sideOffset={5}
              >
                {content}
              </Tooltip>
            ) : (
              content
            );
          })}
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
