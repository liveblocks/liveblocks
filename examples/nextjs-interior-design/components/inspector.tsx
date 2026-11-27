"use client";

import {
  BringToFrontIcon,
  CopyIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  SendToBackIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { PlanActions } from "@/hooks/use-plan-actions";
import { getCatalogItem } from "@/lib/catalog";
import {
  findWall,
  normalizeAngle,
  perimeter,
  polygonArea,
} from "@/lib/geometry";
import {
  DOOR_STYLES,
  FLOOR_FINISHES,
  ROOM_NAMES,
  type FloorFinish,
  type Furniture,
  type Opening,
  type Room,
  type Selection,
} from "@/lib/plan";
import {
  formatArea,
  formatLength,
  fromDisplaySize,
  sizeSuffix,
  toDisplaySize,
  type Unit,
} from "@/lib/units";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type InspectorProps = {
  selection: Selection;
  rooms: ReadonlyMap<string, Room>;
  openings: ReadonlyMap<string, Opening>;
  furniture: ReadonlyMap<string, Furniture>;
  actions: PlanActions;
  unit: Unit;
  onSelect: (selection: Selection | null) => void;
};

/**
 * Properties of whatever is selected, floating over the top right of the
 * canvas. Every field writes straight to Storage, so edits made here show up
 * on everyone's plan like any drag does.
 */
export function Inspector({
  selection,
  rooms,
  openings,
  furniture,
  actions,
  unit,
  onSelect,
}: InspectorProps) {
  const remove = () => {
    actions.remove(selection);
    onSelect(null);
  };

  let content: ReactNode = null;
  if (selection.kind === "room") {
    const room = rooms.get(selection.id);
    content = room ? (
      <RoomInspector
        key={room.id}
        room={room}
        actions={actions}
        unit={unit}
        onRemove={remove}
      />
    ) : null;
  } else if (selection.kind === "opening") {
    const opening = openings.get(selection.id);
    content = opening ? (
      <OpeningInspector
        key={opening.id}
        opening={opening}
        rooms={rooms}
        actions={actions}
        unit={unit}
        onRemove={remove}
      />
    ) : null;
  } else {
    const item = furniture.get(selection.id);
    content = item ? (
      <FurnitureInspector
        key={item.id}
        item={item}
        actions={actions}
        unit={unit}
        onSelect={onSelect}
        onRemove={remove}
      />
    ) : null;
  }

  if (!content) {
    return null;
  }

  return (
    <aside
      aria-label="Properties"
      className="card-floating absolute top-3 right-3 flex max-h-[calc(100%-5rem)] w-56 flex-col overflow-y-auto animate-in fade-in-0 slide-in-from-right-1 duration-150"
    >
      {content}
    </aside>
  );
}

/* ---------------------------------------------------------------------- */
/* Room                                                                    */
/* ---------------------------------------------------------------------- */

function RoomInspector({
  room,
  actions,
  unit,
  onRemove,
}: {
  room: Room;
  actions: PlanActions;
  unit: Unit;
  onRemove: () => void;
}) {
  const listId = useId();
  return (
    <>
      <Title label="Room" onRemove={onRemove} />
      <Section>
        <Field label="Name">
          <TextInput
            value={room.name}
            list={listId}
            placeholder="Room"
            onCommit={(name) => actions.updateRoom(room.id, { name })}
          />
          <datalist id={listId}>
            {ROOM_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label="Floor">
          <div className="grid grid-cols-4 gap-1">
            {FLOOR_FINISHES.map((finish) => (
              <button
                key={finish.id}
                type="button"
                aria-pressed={room.floor === finish.id}
                onClick={() =>
                  actions.updateRoom(room.id, { floor: finish.id })
                }
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border p-1 text-[10px] leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  room.floor === finish.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                )}
              >
                <FloorSwatch finish={finish.id} />
                {finish.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>
      <Section>
        <Stat label="Area" value={formatArea(polygonArea(room.points), unit)} />
        <Stat
          label="Perimeter"
          value={formatLength(perimeter(room.points), unit)}
        />
        <Stat label="Walls" value={String(room.points.length)} />
      </Section>
      <Hint>
        Drag a wall or a corner to reshape the room. Drag a + to add a corner;
        double-click a corner to remove it.
      </Hint>
    </>
  );
}

function FloorSwatch({ finish }: { finish: FloorFinish }) {
  return (
    <svg
      viewBox="0 0 28 18"
      className="h-[18px] w-full rounded-[3px] bg-surface ring-1 ring-line"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeOpacity={0.55}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {finish === "wood" ? (
        <path d="M0 6h28M0 12h28M9 0v6M20 6v6M6 12v6M17 12v6" />
      ) : finish === "tile" ? (
        <path d="M0 9h28M7 0v18M14 0v18M21 0v18" />
      ) : finish === "carpet" ? (
        <path
          strokeLinecap="round"
          strokeWidth={1.5}
          d="M4 4h.01M11 4h.01M18 4h.01M25 4h.01M7.5 9h.01M14.5 9h.01M21.5 9h.01M4 14h.01M11 14h.01M18 14h.01M25 14h.01"
        />
      ) : null}
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/* Door or window                                                          */
/* ---------------------------------------------------------------------- */

function OpeningInspector({
  opening,
  rooms,
  actions,
  unit,
  onRemove,
}: {
  opening: Opening;
  rooms: ReadonlyMap<string, Room>;
  actions: PlanActions;
  unit: Unit;
  onRemove: () => void;
}) {
  const wall = findWall(rooms, opening.roomId, opening.wallId);
  const isDoor = opening.kind === "door";
  const hasLeaf =
    isDoor && (opening.style === "single" || opening.style === "double");

  return (
    <>
      <Title label={isDoor ? "Door" : "Window"} onRemove={onRemove} />
      <Section>
        {isDoor ? (
          <Field label="Type">
            <div className="grid grid-cols-2 gap-1">
              {DOOR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={opening.style === style.id}
                  onClick={() =>
                    actions.updateOpening(opening.id, { style: style.id })
                  }
                  className={cn(
                    "h-7 rounded-md border text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    opening.style === style.id
                      ? "border-brand bg-brand-soft font-medium text-brand"
                      : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <SizeInput
              value={opening.width}
              unit={unit}
              min={40}
              max={wall ? Math.max(40, wall.length - 8) : 400}
              onCommit={(width) => actions.updateOpening(opening.id, { width })}
            />
          </Field>
          <Field label="From corner">
            <SizeInput
              value={opening.offset - opening.width / 2}
              unit={unit}
              min={4}
              max={wall ? Math.max(4, wall.length - opening.width - 4) : 2000}
              onCommit={(start) =>
                actions.updateOpening(opening.id, {
                  offset: start + opening.width / 2,
                })
              }
            />
          </Field>
        </div>
      </Section>
      {hasLeaf ? (
        <Section>
          <div className="flex items-center gap-1">
            {opening.style === "single" ? (
              <Action
                label="Flip hinge side"
                shortcut="F"
                onClick={() =>
                  actions.updateOpening(opening.id, {
                    hinge: opening.hinge === "start" ? "end" : "start",
                  })
                }
              >
                <FlipHorizontal2Icon />
              </Action>
            ) : null}
            <Action
              label="Flip swing direction"
              shortcut="⇧F"
              onClick={() =>
                actions.updateOpening(opening.id, {
                  swing: opening.swing === "in" ? "out" : "in",
                })
              }
            >
              <FlipVertical2Icon />
            </Action>
          </div>
        </Section>
      ) : null}
      <Hint>Drag it along its wall, or onto any other wall.</Hint>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Furniture                                                               */
/* ---------------------------------------------------------------------- */

function FurnitureInspector({
  item,
  actions,
  unit,
  onSelect,
  onRemove,
}: {
  item: Furniture;
  actions: PlanActions;
  unit: Unit;
  onSelect: (selection: Selection | null) => void;
  onRemove: () => void;
}) {
  const turn = (degrees: number) =>
    actions.updateFurniture(item.id, {
      rotation: normalizeAngle(item.rotation + degrees),
    });

  return (
    <>
      <Title
        label={getCatalogItem(item.type)?.name ?? "Furniture"}
        onRemove={onRemove}
      />
      <Section>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Width">
            <SizeInput
              value={item.width}
              unit={unit}
              min={20}
              max={1000}
              onCommit={(width) => actions.updateFurniture(item.id, { width })}
            />
          </Field>
          <Field label="Depth">
            <SizeInput
              value={item.depth}
              unit={unit}
              min={20}
              max={1000}
              onCommit={(depth) => actions.updateFurniture(item.id, { depth })}
            />
          </Field>
          <Field label="Angle">
            <NumberInput
              value={Math.round(item.rotation)}
              suffix="°"
              step={15}
              onCommit={(rotation) =>
                actions.updateFurniture(item.id, {
                  rotation: normalizeAngle(rotation),
                })
              }
            />
          </Field>
        </div>
      </Section>
      <Section>
        <div className="flex items-center gap-1">
          <Action label="Rotate left" shortcut="Q" onClick={() => turn(-90)}>
            <RotateCcwIcon />
          </Action>
          <Action label="Rotate right" shortcut="E" onClick={() => turn(90)}>
            <RotateCwIcon />
          </Action>
          <Action
            label="Duplicate"
            shortcut="⌘D"
            onClick={() => {
              const id = actions.duplicateFurniture(item.id);
              if (id) {
                onSelect({ kind: "furniture", id });
              }
            }}
          >
            <CopyIcon />
          </Action>
          <Action
            label="Bring to front"
            onClick={() => actions.reorderFurniture(item.id, "front")}
          >
            <BringToFrontIcon />
          </Action>
          <Action
            label="Send to back"
            onClick={() => actions.reorderFurniture(item.id, "back")}
          >
            <SendToBackIcon />
          </Action>
        </div>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Building blocks                                                         */
/* ---------------------------------------------------------------------- */

function Title({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-3">
      <h2 className="truncate text-[13px] font-semibold text-ink">{label}</h2>
      <Action label="Delete" shortcut="⌫" onClick={onRemove}>
        <Trash2Icon />
      </Action>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-3 py-2.5">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] font-medium text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-line px-3 py-2.5 text-[11px] leading-snug text-ink-muted">
      {children}
    </p>
  );
}

function Action({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors outline-none hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-3.5"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
        {shortcut ? (
          <kbd className="ml-2 font-sans text-background/60">{shortcut}</kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

const INPUT_CLASS =
  "h-7 w-full min-w-0 rounded-md border border-line bg-surface px-2 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-brand focus:ring-2 focus:ring-brand/15";

// A text field that writes to Storage when you're done typing (Enter, or
// leaving the field) rather than on every keystroke, so a rename is a single
// change, and a single undo step.
function TextInput({
  value,
  onCommit,
  ...props
}: {
  value: string;
  onCommit: (value: string) => void;
  list?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft.trim() !== value) {
      onCommit(draft.trim());
    }
    setDraft(null);
  };

  return (
    <input
      type="text"
      className={INPUT_CLASS}
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(null);
        }
      }}
      {...props}
    />
  );
}

function NumberInput({
  value,
  onCommit,
  suffix,
  step = 1,
  min = -Infinity,
  max = Infinity,
}: {
  value: number;
  onCommit: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string | null) => {
    setDraft(null);
    if (text === null) {
      return;
    }
    const parsed = Number.parseFloat(text.replace(",", "."));
    if (Number.isFinite(parsed)) {
      const next = Math.min(Math.max(parsed, min), max);
      if (next !== value) {
        onCommit(next);
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      setDraft(null);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Step the value with the arrow keys; Shift for bigger steps.
      event.preventDefault();
      const current = Number.parseFloat(draft ?? String(value));
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const amount = step * (event.shiftKey ? 10 : 1);
      commit(
        String(
          (Number.isFinite(current) ? current : value) + direction * amount
        )
      );
    }
  };

  return (
    <span className="relative flex">
      <input
        type="text"
        inputMode="decimal"
        className={cn(INPUT_CLASS, "font-mono text-xs", suffix && "pr-6")}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => commit(draft)}
        onKeyDown={handleKeyDown}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] text-ink-faint">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

// A length field shown in the person's units, and stored in centimeters.
function SizeInput({
  value,
  unit,
  min,
  max,
  onCommit,
}: {
  value: number;
  unit: Unit;
  min: number;
  max: number;
  onCommit: (centimeters: number) => void;
}) {
  return (
    <NumberInput
      value={toDisplaySize(value, unit)}
      suffix={sizeSuffix(unit)}
      step={unit === "metric" ? 5 : 1}
      min={toDisplaySize(min, unit)}
      max={toDisplaySize(max, unit)}
      onCommit={(next) =>
        onCommit(Math.round(fromDisplaySize(next, unit) * 10) / 10)
      }
    />
  );
}
