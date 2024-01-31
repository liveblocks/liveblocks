import clsx from "clsx";
import { InboxPopover } from "./Inbox";
import { ComponentProps } from "react";
import { UserSelect } from "./UserSelect";
import { NAMES } from "../database";
import { UserAvatar } from "./UserAvatar";

export function Header({ className, ...props }: ComponentProps<"header">) {
  return (
    <header className={clsx(className, "header")} {...props}>
      <div className="header-user">
        <UserAvatar />
        <UserSelect users={NAMES} />
      </div>
      <InboxPopover />
    </header>
  );
}
