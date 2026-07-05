import { SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { SlashCommandItem } from "./items";

export type SlashCommandMenuHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SuggestionProps<SlashCommandItem>
>(function SlashCommandMenu({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
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
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  function onItemMouseDown(
    event: ReactMouseEvent<HTMLButtonElement>,
    index: number
  ) {
    event.preventDefault();
    selectItem(index);
  }

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-xl border border-border bg-popover p-2 text-sm text-muted-foreground shadow-xl">
        No commands found
      </div>
    );
  }

  return (
    <div className="w-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
      <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Insert
      </div>
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "text-popover-foreground hover:bg-accent/60"
          }`}
          onMouseEnter={() => setSelectedIndex(index)}
          onMouseDown={(event) => onItemMouseDown(event, index)}
        >
          <span className="flex size-9 flex-none items-center justify-center rounded-md border border-border bg-background text-xs font-semibold">
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});
