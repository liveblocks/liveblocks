"use client"

import { siteConfig } from "@/app/siteConfig"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubMenu,
  DropdownMenuSubMenuContent,
  DropdownMenuSubMenuTrigger,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu"
import { ArrowUpRight, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

export type DropdownUserProfileProps = {
  children: React.ReactNode
  align?: "center" | "start" | "end"
}

export function DropdownUserProfile({
  children,
  align = "start",
}: DropdownUserProfileProps) {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="!min-w-[calc(var(--radix-dropdown-menu-trigger-width))]"
        >
          <DropdownMenuLabel>emma.stone@acme.com</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSubMenu>
              <DropdownMenuSubMenuTrigger>Theme</DropdownMenuSubMenuTrigger>
              <DropdownMenuSubMenuContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => {
                    setTheme(value)
                  }}
                >
                  <DropdownMenuRadioItem
                    aria-label="Switch to Light Mode"
                    value="light"
                    iconType="check"
                  >
                    <Sun className="size-4 shrink-0" aria-hidden="true" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to Dark Mode"
                    value="dark"
                    iconType="check"
                  >
                    <Moon className="size-4 shrink-0" aria-hidden="true" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    aria-label="Switch to System Mode"
                    value="system"
                    iconType="check"
                  >
                    <Monitor className="size-4 shrink-0" aria-hidden="true" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Changelog
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500 dark:text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
            <DropdownMenuItem>
              Documentation
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
            <DropdownMenuItem>
              Join Slack community
              <ArrowUpRight
                className="mb-1 ml-1 size-3 shrink-0 text-gray-500"
                aria-hidden="true"
              />
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <a href={siteConfig.baseLinks.login} className="w-full">
                Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
