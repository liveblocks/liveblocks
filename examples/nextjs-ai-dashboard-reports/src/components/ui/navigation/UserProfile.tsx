"use client"

import { Button } from "@/components/Button"
import { cx, focusRing } from "@/lib/utils"
import { ChevronsUpDown, Loader2, User } from "lucide-react"
import Image from "next/image"

import { DropdownUserProfile } from "./DropdownUserProfile"
import { useLiveblocksDashboardUser } from "./useLiveblocksDashboardUser"

interface UserProfileDesktopProps {
  isCollapsed?: boolean
}

export const UserProfileDesktop = ({
  isCollapsed,
}: UserProfileDesktopProps) => {
  const me = useLiveblocksDashboardUser()

  return (
    <DropdownUserProfile>
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          isCollapsed ? "justify-center" : "justify-between",
          focusRing,
          "group flex w-full items-center rounded-md px-1 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200/50 data-[state=open]:bg-neutral-200/50 dark:hover:bg-neutral-900/50 dark:data-[state=open]:bg-neutral-900",
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
            <span
              className={cx(
                isCollapsed ? "size-5" : "size-8",
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800",
              )}
            >
              {me?.avatar ? (
                <Image
                  src={me.avatar}
                  alt=""
                  width={isCollapsed ? 20 : 32}
                  height={isCollapsed ? 20 : 32}
                  className={cx(
                    isCollapsed ? "size-5" : "size-8",
                    "rounded-full bg-black object-cover dark:bg-white",
                  )}
                  aria-hidden="true"
                />
              ) : (
                <Loader2
                  className={cx(
                    isCollapsed ? "size-3.5" : "size-4",
                    "animate-spin text-neutral-400 dark:text-neutral-500",
                  )}
                  aria-hidden="true"
                />
              )}
            </span>
            <span className={cx(isCollapsed ? "hidden" : "block")}>
              {me?.name ?? "Connecting…"}
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
  const me = useLiveblocksDashboardUser()

  return (
    <DropdownUserProfile align="end">
      <Button
        aria-label="User settings"
        variant="ghost"
        className={cx(
          "group flex items-center rounded-md p-0.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200/50 data-[state=open]:bg-neutral-200/50 sm:p-1 dark:hover:bg-neutral-900/50 dark:data-[state=open]:bg-neutral-800/50",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 sm:size-7 dark:bg-neutral-800">
          {me?.avatar ? (
            <Image
              src={me.avatar}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-full bg-black object-cover sm:size-7 dark:bg-white"
              aria-hidden="true"
            />
          ) : (
            <Loader2
              className="size-4 shrink-0 animate-spin text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
          )}
        </span>
      </Button>
    </DropdownUserProfile>
  )
}
