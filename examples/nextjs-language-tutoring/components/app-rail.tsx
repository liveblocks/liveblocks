"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/app-context";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function AppRail() {
  const { user, href } = useApp();
  const pathname = usePathname();
  if (!user) return null;

  const inRoom = pathname !== "/";

  return (
    <nav
      aria-label="App"
      className="flex w-11 shrink-0 flex-col items-center py-3 pl-3"
    >
      {inRoom ? (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label="Back to rooms"
          className="text-neutral-500"
        >
          <Link href={href("/")}>
            <ArrowLeftIcon />
          </Link>
        </Button>
      ) : null}
      <div className="mt-auto flex flex-col items-center gap-2">
        <HelpButton />
        <UserMenu />
      </div>
    </nav>
  );
}
