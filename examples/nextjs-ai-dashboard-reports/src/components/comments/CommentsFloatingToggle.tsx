"use client";

import { MessageSquareIcon } from "lucide-react";

import { useCommentsSidebar } from "@/components/comments/CommentsSidebarContext";
import { cx } from "@/lib/utils";

const mobileHeaderButtonStyles =
  "*:text-neutral-600 dark:*:text-neutral-400 size-[38px] relative justify-center border text-center whitespace-nowrap transition-all duration-100 ease-in-out sm:text-sm disabled:pointer-events-none disabled:shadow-none outline-solid outline-offset-2 outline-0 focus-visible:outline-2 outline-blue-500 dark:outline-blue-500 shadow-none border-transparent text-neutral-900 dark:text-neutral-50 bg-transparent disabled:text-neutral-400 dark:disabled:text-neutral-600 group flex items-center rounded-md p-1.5 text-sm font-medium hover:bg-neutral-50 data-[state=open]:bg-neutral-400/10 dark:hover:bg-neutral-400/10";

const desktopFloatingButtonStyles =
  "mt-px inline-flex size-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900";

type CommentsOpenButtonProps = {
  className?: string;
  variant?: "mobile-header" | "desktop-floating";
  hideWhenOpen?: boolean;
};

export function CommentsOpenButton({
  className,
  variant = "mobile-header",
  hideWhenOpen = false,
}: CommentsOpenButtonProps) {
  const { open, setOpen } = useCommentsSidebar();

  if (hideWhenOpen && open) {
    return null;
  }

  const isMobile = variant === "mobile-header";

  return (
    <button
      type="button"
      onClick={() => {
        if (hideWhenOpen) {
          setOpen(true);
        } else {
          setOpen(!open);
        }
      }}
      className={cx(
        isMobile ? mobileHeaderButtonStyles : desktopFloatingButtonStyles,
        isMobile &&
          open &&
          !hideWhenOpen &&
          "bg-neutral-100 dark:bg-neutral-400/10",
        className
      )}
      aria-expanded={open}
      aria-label={open ? "Close comments" : "Open comments"}
    >
      <MessageSquareIcon
        className={cx("shrink-0", isMobile ? "size-5" : "size-4")}
        aria-hidden
      />
    </button>
  );
}

export function CommentsFloatingToggle() {
  return (
    <div className="relative mr-px isolate z-100">
      <CommentsOpenButton
        variant="desktop-floating"
        hideWhenOpen
        className="comments-sidebar-trigger pointer-events-auto absolute top-3 right-2 hidden lg:inline-flex"
      />
    </div>
  );
}
