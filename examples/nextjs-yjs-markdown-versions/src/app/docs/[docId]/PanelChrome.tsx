import type { ReactNode } from "react";

export const panelShellClass =
  "bg-bg-elev border-border flex h-full flex-col overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

export function PanelHeader({
  label,
  meta,
}: {
  label: string;
  meta?: ReactNode;
}) {
  return (
    <div className="border-border flex h-9 flex-none items-center justify-between border-b px-3 text-xs">
      <span className="text-text font-bold tracking-tight">{label}</span>
      {meta ? (
        <span className="text-text-muted font-mono text-[11px]">{meta}</span>
      ) : null}
    </div>
  );
}
