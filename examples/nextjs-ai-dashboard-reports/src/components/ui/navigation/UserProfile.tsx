"use client"

import { Button } from "@/components/Button"
import { cx, focusRing } from "@/lib/utils"
import { ChevronsUpDown, User } from "lucide-react"
import Image from "next/image"
import { users } from "@/data/users"

import { DropdownUserProfile } from "./DropdownUserProfile"

interface UserProfileDesktopProps {
  isCollapsed?: boolean
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
          "group flex w-full items-center rounded-md px-1 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200/50 data-[state=open]:bg-neutral-200/50 dark:hover:bg-neutral-800/50 dark:data-[state=open]:bg-neutral-900",
        )}
      >
        {isCollapsed ? (
          // h-8 to avoid layout shift with icon shown in isCollapsibled == false
          <div className="flex h-8 items-center">
            <User
              className="size-5 shrink-0 text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300"
              aria-hidden="true"
            />
          </div>
        ) : (
          <span className="flex items-center gap-2.5">
            <Image
              src={users[0].avatar}
              alt="User avatar"
              width={isCollapsed ? 20 : 32}
              height={isCollapsed ? 20 : 32}
              className={cx(
                isCollapsed ? "size-5" : "size-8",
                "rounded-full bg-black dark:bg-white",
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
            className="size-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600"
            aria-hidden="true"
          />
        )}
      </Button>
    </DropdownUserProfile>
  )
}

export const UserProfileMobile = () => {
  return (
    <DropdownUserProfile align="end">
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          "group flex items-center rounded-md p-0.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200/50 data-[state=open]:bg-neutral-200/50 sm:p-1 dark:hover:bg-neutral-800/50 dark:data-[state=open]:bg-neutral-800/50",
        )}
      >
        <Image
          src={users[0].avatar}
          alt="User avatar"
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full bg-black sm:size-7 dark:bg-white"
          aria-hidden="true"
        />
      </Button>
    </DropdownUserProfile>
  )
}
