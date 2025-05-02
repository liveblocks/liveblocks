"use client"
import React from "react"

import { TabNavigation, TabNavigationLink } from "@/components/TabNavigation"
import { Sidebar } from "@/components/ui/navigation/Sidebar"
import { cx } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { siteConfig } from "../siteConfig"

const navigationSettings = [
  { name: "Audit", href: siteConfig.baseLinks.settings.audit },
  { name: "Billing & Usage", href: siteConfig.baseLinks.settings.billing },
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
    <div className="mx-auto max-w-screen-2xl">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div
        className={cx(
          isCollapsed ? "lg:pl-[60px]" : "lg:pl-64",
          "ease transform-gpu overflow-x-hidden transition-all duration-100 will-change-transform lg:bg-gray-50 lg:py-3 lg:pr-3 lg:dark:bg-gray-950",
        )}
      >
        <div className="min-h-dvh bg-white p-4 sm:p-6 lg:rounded-lg lg:border lg:border-gray-200 dark:bg-gray-925 lg:dark:border-gray-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Settings
          </h1>
          <TabNavigation className="mt-6">
            {navigationSettings.map((item) => (
              <TabNavigationLink
                key={item.name}
                asChild
                active={pathname === item.href}
                className="px-5"
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
