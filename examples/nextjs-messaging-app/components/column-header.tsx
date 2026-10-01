import type { ReactNode } from "react";

// Header of the secondary column, aligned with the chat header's height
export function ColumnHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-[53px] shrink-0 items-center gap-2 border-b border-neutral-200 px-4">
      <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-neutral-900">
        {title}
      </h2>
      {children}
    </header>
  );
}
