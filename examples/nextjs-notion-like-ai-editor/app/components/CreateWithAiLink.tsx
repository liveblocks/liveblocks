"use client";

import { SparklesIcon } from "../icons/SparklesIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Client component just to show when it's active
export function CreateWithAiLink() {
  const pathname = usePathname();

  return (
    <Link
      href="/chat"
      data-active={pathname === "/chat" || undefined}
      className="py-1.5 px-3 flex-1 truncate flex gap-1.5 font-medium items-center hover:bg-gray-200/80 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm data-[active]:bg-gray-200/80 data-[active]:text-gray-900"
    >
      <SparklesIcon className="w-4 h-4 -ml-0.5" />
      Create with AI
    </Link>
  );
}
