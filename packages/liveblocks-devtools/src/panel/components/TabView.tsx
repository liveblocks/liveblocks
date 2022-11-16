import type { TabsProps as DefaultTabsProps } from "@radix-ui/react-tabs";
import { Content, List, Root, Trigger } from "@radix-ui/react-tabs";
import cx from "classnames";
import type { ReactNode } from "react";

interface Tab {
  value: string;
  title: string;
  content: ReactNode;
}

interface TabViewProps extends DefaultTabsProps {
  tabs: Tab[];
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function TabView({
  tabs,
  className,
  leading,
  trailing,
  ...props
}: TabViewProps) {
  return (
    <Root className={cx(className, "flex flex-col")} {...props}>
      <div className="flex h-8 border-b border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
        {leading ?? null}
        <List className="flex h-full flex-none overflow-x-auto px-2 text-gray-600 dark:text-gray-400">
          {tabs.map((tab) => (
            <Trigger
              key={tab.value}
              value={tab.value}
              className={cx(
                "relative flex items-center px-3",
                "after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:hidden after:h-0.5 after:w-full after:bg-orange-500 [&[data-state='active']]:after:block",
                "hover:bg-gray-100 hover:text-gray-800 focus-visible:bg-gray-100 focus-visible:text-gray-800 [&[data-state='active']]:text-gray-800",
                "dark:after:bg-orange-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus-visible:bg-gray-800 dark:focus-visible:text-gray-200 dark:[&[data-state='active']]:text-gray-200"
              )}
            >
              {tab.title}
            </Trigger>
          ))}
        </List>
        {trailing ?? null}
      </div>
      {tabs.map((tab) => (
        <Content
          key={tab.value}
          value={tab.value}
          className="flex-1 overflow-y-auto"
        >
          {tab.content}
        </Content>
      ))}
    </Root>
  );
}
