"use client"
import React from "react"

import { TabNavigation, TabNavigationLink } from "@/components/TabNavigation"
import { Sidebar } from "@/components/ui/navigation/Sidebar"
import { cx } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { siteConfig } from "../siteConfig"

const navigationSettings = [
  // { name: "Audit", href: siteConfig.baseLinks.settings.audit },
  { name: "Billing & usage", href: siteConfig.baseLinks.settings.billing },
  { name: "Users", href: siteConfig.baseLinks.settings.users },
]

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }
  const pathname = usePathname()
  return (
    <div className="mx-auto max-w-(--breakpoint-2xl)">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div
        className={cx(
          isCollapsed ? "lg:pl-[60px]" : "lg:pl-64",
          "ease transform-gpu overflow-x-hidden transition-all duration-100 will-change-transform lg:bg-neutral-50 lg:py-3 lg:pr-3 lg:dark:bg-neutral-950",
        )}
      >
        <div className="min-h-dvh bg-white p-4 sm:p-6 lg:rounded-lg lg:border lg:border-neutral-200 dark:bg-neutral-950 lg:dark:border-neutral-900">
          <h1 className="text-lg font-semibold tracking-[-0.015em] text-neutral-900 dark:text-neutral-50">
            Settings
          </h1>
          <TabNavigation className="mt-6 gap-4">
            {navigationSettings.map((item) => (
              <TabNavigationLink
                key={item.name}
                asChild
                active={pathname === item.href}
              >
                <Link href={item.href}>{item.name}</Link>
              </TabNavigationLink>
            ))}
          </TabNavigation>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
