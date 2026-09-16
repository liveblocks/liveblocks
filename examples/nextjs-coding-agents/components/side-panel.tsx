"use client";

import clsx from "clsx";
import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const STORAGE_COLLAPSED_KEY = "liveblocks-coding-agents:side-panel-collapsed";
const STORAGE_WIDTH_KEY = "liveblocks-coding-agents:side-panel-width";
const DEFAULT_WIDTH = 520;
const MIN_WIDTH = 360;

export type SidePanelTab = {
  id: string;
  label: string;
  icon: ReactNode;
};

/** Lets any part of the chat (e.g. a message card) open a panel tab. */
export const SidePanelContext = createContext<{
  open: (tabId: string) => void;
} | null>(null);

export function useSidePanel() {
  return useContext(SidePanelContext);
}

function readStorage<T>(key: string, fallback: T, parse: (raw: string) => T) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : parse(raw);
}

/**
 * The collapsible, resizable panel to the right of a chat. It hosts the
 * agent's code changes and any documents it wrote, one tab each. Collapsed
 * and width state persist across chats in localStorage.
 */
/**
 * Whether the panel is folded to a rail. Owned outside `SidePanel` so that
 * opening a tab from elsewhere (a card in a message) can also unfold it.
 */
export function useSidePanelCollapsed() {
  const [collapsed, setCollapsedState] = useState(() =>
    readStorage(STORAGE_COLLAPSED_KEY, false, (raw) => raw === "true")
  );
  const setCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_COLLAPSED_KEY, String(value));
    setCollapsedState(value);
  }, []);
  return [collapsed, setCollapsed] as const;
}

export function SidePanel({
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onCollapsedChange,
  children,
}: {
  tabs: SidePanelTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(() =>
    readStorage(STORAGE_WIDTH_KEY, DEFAULT_WIDTH, Number)
  );

  const toggleCollapsed = useCallback(
    () => onCollapsedChange(!collapsed),
    [collapsed, onCollapsedChange]
  );

  // Drag the left edge to resize; the width is clamped to the viewport.
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      const onMove = (move: PointerEvent) => {
        const max = Math.floor(window.innerWidth * 0.7);
        const next = Math.min(
          max,
          Math.max(MIN_WIDTH, startWidth + (startX - move.clientX))
        );
        setWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setWidth((current) => {
          localStorage.setItem(STORAGE_WIDTH_KEY, String(current));
          return current;
        });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width]
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center gap-1 border-l border-border py-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show panel"
          aria-label="Show panel"
          className="flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground"
        >
          <PanelRightOpenIcon className="size-3.5" />
        </button>
        <span className="my-1 h-px w-5 bg-border" />
        {/* One shortcut per tab: opens the panel on that tab */}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onTabChange(tab.id);
              onCollapsedChange(false);
            }}
            title={tab.label}
            aria-label={tab.label}
            className={clsx(
              "flex size-8 items-center justify-center rounded-md transition hover:bg-panel-hover hover:text-foreground",
              tab.id === activeTab ? "text-foreground" : "text-muted"
            )}
          >
            {tab.icon}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-l border-border bg-background"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startResize}
        className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-accent/30"
      />

      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border pr-2 pl-1">
        <div
          role="tablist"
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className={clsx(
                  "flex h-8 max-w-48 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
                  selected
                    ? "bg-panel-active text-foreground"
                    : "text-muted hover:bg-panel-hover hover:text-foreground"
                )}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          title="Hide panel"
          aria-label="Hide panel"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-panel-hover hover:text-foreground"
        >
          <PanelRightCloseIcon className="size-3.5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

/** Small icon button for the toolbars inside panel views. */
export function PanelIconButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "flex size-7 items-center justify-center rounded-md transition hover:bg-panel-hover hover:text-foreground",
        active ? "bg-panel-active text-foreground" : "text-muted"
      )}
    >
      {children}
    </button>
  );
}
