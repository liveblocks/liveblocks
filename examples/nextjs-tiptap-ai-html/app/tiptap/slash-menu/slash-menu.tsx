import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlashCommandItem } from "./items";

export type SlashMenuHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type SlashMenuProps = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  function SlashMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Keep the keyboard-selected item visible in the scrollable list
    useEffect(() => {
      const selectedElement = listRef.current?.querySelector(
        "[data-selected='true']"
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const groups = useMemo(() => {
      return items.reduce<Array<{ title: string; items: SlashCommandItem[] }>>(
        (acc, item) => {
          const title = item.group || "Basic blocks";
          const group = acc.find((entry) => entry.title === title);

          if (group) {
            group.items.push(item);
          } else {
            acc.push({ title, items: [item] });
          }

          return acc;
        },
        []
      );
    }, [items]);

    function selectItem(index: number) {
      const item = items[index];

      if (item) {
        command(item);
      }
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((index) =>
            items.length ? (index + items.length - 1) % items.length : 0
          );
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((index) =>
            items.length ? (index + 1) % items.length : 0
          );
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-72 rounded-lg border border-border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
          No results
        </div>
      );
    }

    let itemIndex = 0;

    return (
      <div className="w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {groups.map((group) => (
            <div key={group.title} className="py-1">
              <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.title}
              </div>
              {group.items.map((item) => {
                const currentIndex = itemIndex;
                itemIndex += 1;

                return (
                  <button
                    key={item.title}
                    type="button"
                    data-selected={selectedIndex === currentIndex}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition ${
                      selectedIndex === currentIndex
                        ? "bg-accent text-accent-foreground"
                        : "text-popover-foreground hover:bg-accent/70"
                    }`}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectItem(currentIndex);
                    }}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
