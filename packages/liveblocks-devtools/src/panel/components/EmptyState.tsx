import cx from "classnames";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import browser from "webextension-polyfill";

type Action =
  | {
      title: string;
      href: string;
      onClick?: never;
    }
  | {
      title: string;
      onClick: (event: MouseEvent<HTMLButtonElement>) => void;
      href?: never;
    };

interface Props extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  visual?: ReactNode;
  actions?: Action[];
}

export function EmptyState({
  title,
  description,
  visual,
  actions = [],
  className,
  ...props
}: Props) {
  return (
    <div
      className={cx(
        className,
        "absolute inset-0 flex h-full flex-col items-center justify-center p-8 text-center"
      )}
      {...props}
    >
      {visual && <div className="mb-6">{visual}</div>}
      <div className="flex flex-col items-center justify-center gap-2">
        <h4 className="text-dark-300 dark:text-light-500 text-base font-medium leading-normal">
          {title}
        </h4>
        {description && (
          <p className="text-dark-500 dark:text-light-800 max-w-[320px] text-xs leading-normal">
            {description}
          </p>
        )}
      </div>
      {actions.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          {actions.map((action, index) => {
            const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
              if (action.href) {
                browser.tabs.create({
                  url: action.href,
                });
              } else {
                action.onClick?.(event);
              }
            };

            return (
              <button
                key={index}
                onClick={handleClick}
                className="text-light-0 dark:text-dark-0 bg-brand-dark dark:bg-brand-light flex flex-none cursor-pointer items-center justify-center gap-2 rounded-md py-1.5 px-3 font-medium hover:opacity-80 focus-visible:opacity-50"
              >
                {action.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
