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
import type { ReactNode } from "react";
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
import { Button } from "./ui/button";
import { NumberInput } from "./ui/number-input";
import { SuggestInput } from "./ui/suggest-input";
import { Toggle, ToggleGroup } from "./ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "./ui/tooltip";

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
      className="card-floating panel-in absolute top-3 right-3 flex max-h-[calc(100%-5rem)] w-56 flex-col overflow-y-auto"
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
  return (
    <>
      <Title label="Room" onRemove={onRemove} />
      <Section>
        <Group label="Name">
          <SuggestInput
            label="Name"
            value={room.name}
            options={ROOM_NAMES}
            placeholder="Room"
            onCommit={(name) => actions.updateRoom(room.id, { name })}
          />
        </Group>
        <Group label="Floor">
          <ToggleGroup
            aria-label="Floor"
            value={[room.floor]}
            deselectable={false}
            onValueChange={([next]) => {
              const finish = FLOOR_FINISHES.find((item) => item.id === next);
              if (finish) {
                actions.updateRoom(room.id, { floor: finish.id });
              }
            }}
            className="grid grid-cols-4 gap-1"
          >
            {FLOOR_FINISHES.map((finish) => (
              <Toggle
                key={finish.id}
                value={finish.id}
                className="flex-col gap-1 rounded-md border border-line p-1 text-[10px] leading-none text-ink-muted hover:border-line-strong hover:text-ink data-pressed:border-brand data-pressed:bg-brand-soft data-pressed:text-brand"
              >
                <FloorSwatch finish={finish.id} />
                {finish.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </Group>
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
          <Group label="Type">
            <ToggleGroup
              aria-label="Type"
              value={[opening.style]}
              deselectable={false}
              onValueChange={([next]) => {
                const style = DOOR_STYLES.find((item) => item.id === next);
                if (style) {
                  actions.updateOpening(opening.id, { style: style.id });
                }
              }}
              className="grid grid-cols-2 gap-1"
            >
              {DOOR_STYLES.map((style) => (
                <Toggle
                  key={style.id}
                  value={style.id}
                  className="h-7 rounded-md border border-line text-xs text-ink-secondary hover:border-line-strong hover:text-ink data-pressed:border-brand data-pressed:bg-brand-soft data-pressed:font-medium data-pressed:text-brand"
                >
                  {style.label}
                </Toggle>
              ))}
            </ToggleGroup>
          </Group>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <SizeInput
              label="Width"
              value={opening.width}
              unit={unit}
              min={40}
              max={wall ? Math.max(40, wall.length - 8) : 400}
              onCommit={(width) => actions.updateOpening(opening.id, { width })}
            />
          </Field>
          <Field label="From corner">
            <SizeInput
              label="From corner"
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
                shortcut="f"
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
              shortcut="shift+f"
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
              label="Width"
              value={item.width}
              unit={unit}
              min={20}
              max={1000}
              onCommit={(width) => actions.updateFurniture(item.id, { width })}
            />
          </Field>
          <Field label="Depth">
            <SizeInput
              label="Depth"
              value={item.depth}
              unit={unit}
              min={20}
              max={1000}
              onCommit={(depth) => actions.updateFurniture(item.id, { depth })}
            />
          </Field>
          <Field label="Angle">
            <NumberInput
              label="Angle"
              value={Math.round(item.rotation)}
              suffix="°"
              largeStep={15}
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
          <Action label="Rotate left" shortcut="q" onClick={() => turn(-90)}>
            <RotateCcwIcon />
          </Action>
          <Action label="Rotate right" shortcut="e" onClick={() => turn(90)}>
            <RotateCwIcon />
          </Action>
          <Action
            label="Duplicate"
            shortcut="mod+d"
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
      <Action label="Delete" shortcut="backspace" onClick={onRemove}>
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

// A number field under its label. Pressing the label focuses the field.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

// Anything else under a label: a set of choices, or a field with a popup,
// which a <label> around it would take presses from.
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="truncate text-[11px] font-medium text-ink-muted"
    >
      {children}
    </span>
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
  // The keys that do the same, like "mod+d". They're bound in the canvas.
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip shortcut={shortcut}>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            onClick={onClick}
            className="[&_svg:not([class*='size-'])]:size-3.5"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <TooltipShortcut />
      </TooltipContent>
    </Tooltip>
  );
}

// Arrow keys move a length by a centimeter or half an inch; with Shift, by
// ten centimeters or half a foot.
const SIZE_STEPS = {
  metric: { step: 1, largeStep: 10, decimals: 0 },
  imperial: { step: 0.5, largeStep: 6, decimals: 1 },
} as const;

// A length field shown in the person's units, and stored in centimeters.
function SizeInput({
  label,
  value,
  unit,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  unit: Unit;
  min: number;
  max: number;
  onCommit: (centimeters: number) => void;
}) {
  const { step, largeStep, decimals } = SIZE_STEPS[unit];
  // The limits are rounded inwards to whole steps: the field counts its
  // steps from `min`.
  const lowest = Math.ceil(fromCentimeters(min, unit) / step) * step;
  const highest = Math.floor(fromCentimeters(max, unit) / step) * step;
  return (
    <NumberInput
      label={label}
      value={toDisplaySize(value, unit)}
      suffix={sizeSuffix(unit)}
      step={step}
      largeStep={largeStep}
      decimals={decimals}
      min={lowest}
      max={Math.max(lowest, highest)}
      onCommit={(next) =>
        onCommit(Math.round(fromDisplaySize(next, unit) * 10) / 10)
      }
    />
  );
}

function fromCentimeters(centimeters: number, unit: Unit) {
  return centimeters / fromDisplaySize(1, unit);
}
