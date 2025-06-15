"use client";

import { Button } from "@/components/Button";
import { cx, focusRing } from "@/lib/utils";
import { ChevronsUpDown, User } from "lucide-react";
import Image from "next/image";
import { users } from "@/data/users";

import { DropdownUserProfile } from "./DropdownUserProfile";

interface UserProfileDesktopProps {
  isCollapsed?: boolean;
}

export const UserProfileDesktop = ({
  isCollapsed,
}: UserProfileDesktopProps) => {
  return (
    <DropdownUserProfile>
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          isCollapsed ? "justify-center" : "justify-between",
          focusRing,
          "group flex w-full items-center rounded-md px-1 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200/50 data-[state=open]:bg-gray-200/50 dark:hover:bg-gray-800/50 dark:data-[state=open]:bg-gray-900"
        )}
      >
        {isCollapsed ? (
          // h-8 to avoid layout shift with icon shown in isCollapsibled == false
          <div className="flex h-8 items-center">
            <User
              className="size-5 shrink-0 text-gray-500 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-300"
              aria-hidden="true"
            />
          </div>
        ) : (
          <span className="flex items-center gap-3">
            <Image
              src={users[0].avatar}
              alt="User avatar"
              width={isCollapsed ? 20 : 32}
              height={isCollapsed ? 20 : 32}
              className={cx(
                isCollapsed ? "size-5" : "size-8",
                "rounded-full border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900"
              )}
              aria-hidden="true"
            />
            <span className={cx(isCollapsed ? "hidden" : "block")}>
              {users[0].name}
            </span>
          </span>
        )}
        {!isCollapsed && (
          <ChevronsUpDown
            className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-400"
            aria-hidden="true"
          />
        )}
      </Button>
    </DropdownUserProfile>
  );
};

export const UserProfileMobile = () => {
  return (
    <DropdownUserProfile align="end">
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          "group flex items-center rounded-md p-0.5 sm:p-1 text-sm font-medium text-gray-900 hover:bg-gray-200/50 data-[state=open]:bg-gray-200/50 dark:hover:bg-gray-800/50 dark:data-[state=open]:bg-gray-800/50"
        )}
      >
        <Image
          src={users[0].avatar}
          alt="User avatar"
          width={32}
          height={32}
          className="size-8 sm:size-7 shrink-0 rounded-full border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-950"
          aria-hidden="true"
        />
      </Button>
    </DropdownUserProfile>
  );
};
