"use client"
import React from "react"

import { cx } from "@/lib/utils"

import { Sidebar } from "@/components/ui/navigation/Sidebar"

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }
  return (
    <div className="mx-auto max-w-(--breakpoint-2xl)">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main
        className={cx(
          isCollapsed ? "lg:pl-[60px]" : "lg:pl-64",
          "ease transform-gpu transition-all duration-100 will-change-transform lg:bg-neutral-50 lg:py-3 lg:pr-3 lg:dark:bg-black",
        )}
      >
        <div className="bg-white p-4 sm:p-6 lg:rounded-lg lg:border lg:border-neutral-200 dark:bg-neutral-950 lg:dark:border-neutral-900">
          {children}
        </div>
      </main>
    </div>
  )
}
