"use client";

import { bindDrag, bindDragPreview, dragThreshold } from "@ui-sdk/core";
import { Button } from "@ui-sdk/react/button";
import { SearchIcon } from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  CATEGORIES,
  type CatalogItem,
  type FurnitureType,
} from "@/lib/catalog";
import { FurnitureSymbol } from "./canvas/symbols";
import { Input, InputGroup } from "./ui/input";

// Size of a tile's drawing, in pixels.
const THUMBNAIL = { width: 64, height: 40 };

type LibraryProps = {
  // A tile was clicked: add the piece in the middle of the plan.
  onAdd: (type: FurnitureType) => void;
  // A tile was dragged out and dropped at this point of the page.
  onDrop: (type: FurnitureType, clientX: number, clientY: number) => void;
  // The plan's current zoom, so the dragged piece is shown at its real size.
  getZoom: () => number;
};

// The piece being dragged out, as it will look on the plan.
type Ghost = { item: CatalogItem; x: number; y: number; zoom: number };

/**
 * The furniture library: every piece as its plan symbol, grouped by room.
 * Drag a piece onto the plan, or click it to add it in the middle.
 */
export const Library = memo(function Library({
  onAdd,
  onDrop,
  getZoom,
}: LibraryProps) {
  const [query, setQuery] = useState("");
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  // Ends the drag in progress, if the library goes away in the middle of it.
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const categories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return CATEGORIES;
    }
    return CATEGORIES.map((category) => ({
      ...category,
      items: category.name.toLowerCase().includes(needle)
        ? category.items
        : category.items.filter((item) =>
            item.name.toLowerCase().includes(needle)
          ),
    })).filter((category) => category.items.length > 0);
  }, [query]);

  // ui-sdk's `bindDrag` follows the pointer from the tile, over the canvas
  // (and anything else), until it's released. A press that doesn't move is
  // left alone, and comes through as a click.
  function handlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    item: CatalogItem
  ) {
    if (event.button !== 0) {
      return;
    }
    let preview: ReturnType<typeof bindDragPreview> | null = null;
    const end = () => {
      preview?.remove();
      preview = null;
      stopRef.current = null;
    };

    stopRef.current?.();
    const stop = bindDrag(event.currentTarget, event.nativeEvent, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: (start) => {
        // What follows the pointer is the piece at the size it will have on
        // the plan. It's rendered under the pointer just long enough for
        // `bindDragPreview` to take a copy of it, which then moves without
        // rendering anything.
        const at = { x: start.clientX, y: start.clientY };
        flushSync(() => setGhost({ item, ...at, zoom: getZoom() }));
        if (ghostRef.current) {
          preview = bindDragPreview(ghostRef.current, at);
        }
        flushSync(() => setGhost(null));
      },
      onMove: ({ x, y }) => preview?.move(x, y),
      onEnd: (up, canceled) => {
        const dragged = preview !== null;
        end();
        if (dragged && !canceled) {
          onDrop(item.type, up.clientX, up.clientY);
        }
      },
    });
    stopRef.current = () => {
      stop();
      end();
    };
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2">
        <InputGroup className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-ink-faint focus-within:border-line-strong">
          <SearchIcon className="size-3.5 shrink-0" />
          <Input
            type="search"
            value={query}
            onValueChange={(value) => setQuery(value)}
            placeholder="Search furniture"
            aria-label="Search furniture"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
        </InputGroup>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {categories.map((category) => (
          <section key={category.id}>
            <h3 className="px-1 pt-3.5 pb-1.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
              {category.name}
            </h3>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
              {category.items.map((item) => (
                <Button
                  key={item.type}
                  title={`${item.name} · ${item.width} × ${item.depth} cm`}
                  onPointerDown={(event) => handlePointerDown(event, item)}
                  // A drag swallows the click it ends with, so this is a
                  // plain click, or Enter or Space on the tile.
                  onClick={() => onAdd(item.type)}
                  className="group flex cursor-grab flex-col items-center gap-1 rounded-md border border-transparent px-1 pt-2 pb-1.5 transition-colors select-none hover:border-line hover:bg-surface focus-visible:border-line-strong focus-visible:bg-surface focus-visible:outline-none active:cursor-grabbing"
                >
                  <Thumbnail item={item} />
                  <span className="w-full truncate text-center text-[11px] leading-tight text-ink-secondary group-hover:text-ink">
                    {item.name}
                  </span>
                </Button>
              ))}
            </div>
          </section>
        ))}
        {categories.length === 0 ? (
          <p className="px-1 pt-6 text-center text-[13px] text-ink-muted">
            No furniture matches “{query.trim()}”.
          </p>
        ) : null}
      </div>

      {ghost ? (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed z-50 opacity-85 drop-shadow-md"
          style={{
            left: ghost.x - (ghost.item.width * ghost.zoom) / 2,
            top: ghost.y - (ghost.item.depth * ghost.zoom) / 2,
          }}
        >
          <svg
            width={ghost.item.width * ghost.zoom}
            height={ghost.item.depth * ghost.zoom}
            viewBox={`${-ghost.item.width / 2} ${-ghost.item.depth / 2} ${ghost.item.width} ${ghost.item.depth}`}
            className="block overflow-visible"
          >
            <FurnitureSymbol
              type={ghost.item.type}
              width={ghost.item.width}
              depth={ghost.item.depth}
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
});

/**
 * A piece's symbol, scaled to fit its tile. Small pieces are capped rather
 * than blown up to fill the tile, so a side table still looks smaller than a
 * sofa.
 */
function Thumbnail({ item }: { item: CatalogItem }) {
  const scale = Math.min(
    (THUMBNAIL.width - 2) / item.width,
    (THUMBNAIL.height - 2) / item.depth,
    0.5
  );
  const width = THUMBNAIL.width / scale;
  const height = THUMBNAIL.height / scale;
  return (
    <svg
      width={THUMBNAIL.width}
      height={THUMBNAIL.height}
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      aria-hidden
    >
      <FurnitureSymbol type={item.type} width={item.width} depth={item.depth} />
    </svg>
  );
}
