import clsx from "clsx";
import { ComponentProps } from "react";
import { InboxPopover } from "./InboxPopover";
import { User } from "./User";

export function Header({ className, ...props }: ComponentProps<"header">) {
  return (
    <header className={clsx(className, "header")} {...props}>
      <User />
      <InboxPopover />
    </header>
  );
}
