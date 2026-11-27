"use client";

import { SearchIcon } from "lucide-react";
import { memo, useMemo, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  CATEGORIES,
  type CatalogItem,
  type FurnitureType,
} from "@/lib/catalog";
import { FurnitureSymbol } from "./canvas/symbols";

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
  const [drag, setDrag] = useState<{
    item: CatalogItem;
    x: number;
    y: number;
  } | null>(null);

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

  // The drag is tracked on the window, so it carries on over the canvas (and
  // anything else) until the pointer is released.
  function handlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    item: CatalogItem
  ) {
    if (event.button !== 0) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (
        !dragging &&
        Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4
      ) {
        return;
      }
      dragging = true;
      setDrag({ item, x: moveEvent.clientX, y: moveEvent.clientY });
    };
    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", stop);
      setDrag(null);
    };
    const handleUp = (upEvent: globalThis.PointerEvent) => {
      stop();
      if (dragging) {
        onDrop(item.type, upEvent.clientX, upEvent.clientY);
      } else {
        onAdd(item.type);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", stop);
  }

  const zoom = drag ? getZoom() : 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2">
        <label className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-ink-faint focus-within:border-line-strong">
          <SearchIcon className="size-3.5 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search furniture"
            aria-label="Search furniture"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {categories.map((category) => (
          <section key={category.id}>
            <h3 className="px-1 pt-3.5 pb-1.5 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
              {category.name}
            </h3>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
              {category.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  title={`${item.name} · ${item.width} × ${item.depth} cm`}
                  onPointerDown={(event) => handlePointerDown(event, item)}
                  // Pointer presses are handled above; this is for keyboards.
                  onClick={(event) => {
                    if (event.detail === 0) {
                      onAdd(item.type);
                    }
                  }}
                  className="group flex cursor-grab flex-col items-center gap-1 rounded-md border border-transparent px-1 pt-2 pb-1.5 transition-colors select-none hover:border-line hover:bg-surface focus-visible:border-line-strong focus-visible:bg-surface focus-visible:outline-none active:cursor-grabbing"
                >
                  <Thumbnail item={item} />
                  <span className="w-full truncate text-center text-[11px] leading-tight text-ink-secondary group-hover:text-ink">
                    {item.name}
                  </span>
                </button>
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

      {drag
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 opacity-85 drop-shadow-md"
              style={{
                left: drag.x,
                top: drag.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg
                width={drag.item.width * zoom}
                height={drag.item.depth * zoom}
                viewBox={`${-drag.item.width / 2} ${-drag.item.depth / 2} ${drag.item.width} ${drag.item.depth}`}
                className="overflow-visible"
              >
                <FurnitureSymbol
                  type={drag.item.type}
                  width={drag.item.width}
                  depth={drag.item.depth}
                />
              </svg>
            </div>,
            document.body
          )
        : null}
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
