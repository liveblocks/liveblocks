"use client";

import { useMemo, type ReactNode } from "react";
import { shallow } from "@liveblocks/client";
import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useStorage,
  useUndo,
} from "@liveblocks/react/suspense";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BaselineIcon,
  BoldIcon,
  DollarSignIcon,
  EraserIcon,
  HashIcon,
  ItalicIcon,
  MessageSquarePlusIcon,
  PaintBucketIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PercentIcon,
  PlusIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  Trash2Icon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpButton } from "@/components/HelpButton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cellKey,
  type CellFormat,
  type NumberFormat,
} from "@/liveblocks.config";
import { useSelectionValue } from "./SelectionContext";
import { useCellThread } from "./CellThreadContext";
import {
  useSpreadsheetActions,
  type CellTarget,
} from "./useSpreadsheetActions";

const TEXT_COLORS = [
  "#171717",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#fee2e2",
  "#ffedd5",
  "#fef9c3",
  "#dcfce7",
  "#dbeafe",
  "#ede9fe",
  "#fce7f3",
  "#f3f4f6",
];

const FILL_COLORS = [
  "#fee2e2",
  "#ffedd5",
  "#fef9c3",
  "#dcfce7",
  "#dbeafe",
  "#ede9fe",
  "#fce7f3",
  "#f3f4f6",
  "#171717",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function Toolbar({
  chatOpen,
  onToggleChat,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  // The grid keeps its selection when focus moves to the toolbar
  // (`outsideClickDeselects={false}` on the <HotTable>), so toolbar actions can
  // read the live selection directly.
  const selection = useSelectionValue();
  const { setOpenCell } = useCellThread();
  const actions = useSpreadsheetActions();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const rowIds = useStorage((root) => [...root.rowIds], shallow);
  const colIds = useStorage((root) => [...root.colIds], shallow);

  // Toggle states reflect the active (anchor) cell, like a real spreadsheet.
  const anchorFormat = useStorage(
    (root) =>
      selection
        ? root.cells[cellKey(selection.anchor.rowId, selection.anchor.colId)]
            ?.format
        : undefined,
    shallow
  );

  const targets = useMemo<CellTarget[]>(() => {
    if (!selection) {
      return [];
    }
    const result: CellTarget[] = [];
    for (const rowId of selection.rowIds) {
      for (const colId of selection.colIds) {
        result.push({ rowId, colId });
      }
    }
    return result;
  }, [selection]);

  const hasSelection = targets.length > 0;

  const toggle = (key: "bold" | "italic" | "underline" | "strike") => {
    if (!hasSelection) {
      return;
    }
    const patch: Partial<CellFormat> = {};
    patch[key] = !anchorFormat?.[key];
    actions.applyFormat(targets, patch);
  };

  const setAlign = (align: CellFormat["align"]) => {
    if (!hasSelection) {
      return;
    }
    actions.applyFormat(targets, {
      align: anchorFormat?.align === align ? undefined : align,
    });
  };

  const setNumberFormat = (numberFormat: NumberFormat) => {
    if (!hasSelection) {
      return;
    }
    actions.applyFormat(targets, {
      numberFormat: numberFormat === "general" ? undefined : numberFormat,
    });
  };

  const setColor = (color: string | undefined) => {
    if (hasSelection) {
      actions.applyFormat(targets, { color });
    }
  };

  const setBackground = (background: string | undefined) => {
    if (hasSelection) {
      actions.applyFormat(targets, { background });
    }
  };

  const anchorRowIndex = selection
    ? rowIds.indexOf(selection.anchor.rowId)
    : -1;
  const anchorColIndex = selection
    ? colIds.indexOf(selection.anchor.colId)
    : -1;

  return (
    <div className="flex w-full items-center gap-1 overflow-x-auto border-b bg-card px-2 py-1.5">
      <ToolButton
        label="Undo"
        onClick={() => undo()}
        disabled={!canUndo}
        icon={<Undo2Icon className="size-4" />}
      />
      <ToolButton
        label="Redo"
        onClick={() => redo()}
        disabled={!canRedo}
        icon={<Redo2Icon className="size-4" />}
      />

      <ToolbarSeparator />

      <ToolButton
        label="Bold"
        active={!!anchorFormat?.bold}
        disabled={!hasSelection}
        onClick={() => toggle("bold")}
        icon={<BoldIcon className="size-4" />}
      />
      <ToolButton
        label="Italic"
        active={!!anchorFormat?.italic}
        disabled={!hasSelection}
        onClick={() => toggle("italic")}
        icon={<ItalicIcon className="size-4" />}
      />
      <ToolButton
        label="Underline"
        active={!!anchorFormat?.underline}
        disabled={!hasSelection}
        onClick={() => toggle("underline")}
        icon={<UnderlineIcon className="size-4" />}
      />
      <ToolButton
        label="Strikethrough"
        active={!!anchorFormat?.strike}
        disabled={!hasSelection}
        onClick={() => toggle("strike")}
        icon={<StrikethroughIcon className="size-4" />}
      />

      <ToolbarSeparator />

      <ColorMenu
        label="Text color"
        disabled={!hasSelection}
        colors={TEXT_COLORS}
        current={anchorFormat?.color}
        onSelect={setColor}
        icon={<BaselineIcon className="size-4" />}
        resetLabel="Automatic"
      />
      <ColorMenu
        label="Fill color"
        disabled={!hasSelection}
        colors={FILL_COLORS}
        current={anchorFormat?.background}
        onSelect={setBackground}
        icon={<PaintBucketIcon className="size-4" />}
        resetLabel="No fill"
      />

      <ToolbarSeparator />

      <ToolButton
        label="Align left"
        active={anchorFormat?.align === "left" || !anchorFormat?.align}
        disabled={!hasSelection}
        onClick={() => setAlign("left")}
        icon={<AlignLeftIcon className="size-4" />}
      />
      <ToolButton
        label="Align center"
        active={anchorFormat?.align === "center"}
        disabled={!hasSelection}
        onClick={() => setAlign("center")}
        icon={<AlignCenterIcon className="size-4" />}
      />
      <ToolButton
        label="Align right"
        active={anchorFormat?.align === "right"}
        disabled={!hasSelection}
        onClick={() => setAlign("right")}
        icon={<AlignRightIcon className="size-4" />}
      />

      <ToolbarSeparator />

      <ToolButton
        label="General"
        active={!anchorFormat?.numberFormat}
        disabled={!hasSelection}
        onClick={() => setNumberFormat("general")}
        icon={<HashIcon className="size-4" />}
      />
      <ToolButton
        label="Currency"
        active={anchorFormat?.numberFormat === "currency"}
        disabled={!hasSelection}
        onClick={() => setNumberFormat("currency")}
        icon={<DollarSignIcon className="size-4" />}
      />
      <ToolButton
        label="Percent"
        active={anchorFormat?.numberFormat === "percent"}
        disabled={!hasSelection}
        onClick={() => setNumberFormat("percent")}
        icon={<PercentIcon className="size-4" />}
      />

      <ToolbarSeparator />

      <ToolButton
        label="Clear formatting"
        disabled={!hasSelection}
        onClick={() => actions.clearFormatting(targets)}
        icon={<EraserIcon className="size-4" />}
      />

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rows and columns"
              >
                <TableIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Insert / delete</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Rows</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={anchorRowIndex < 0}
            onClick={() => actions.insertRow(anchorRowIndex, actions.nanoid())}
          >
            <PlusIcon className="size-4" /> Insert row above
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={anchorRowIndex < 0}
            onClick={() =>
              actions.insertRow(anchorRowIndex + 1, actions.nanoid())
            }
          >
            <PlusIcon className="size-4" /> Insert row below
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selection}
            onClick={() => selection && actions.deleteRows(selection.rowIds)}
          >
            <Trash2Icon className="size-4" /> Delete selected rows
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={anchorColIndex < 0}
            onClick={() =>
              actions.insertColumn(anchorColIndex, actions.nanoid())
            }
          >
            <PlusIcon className="size-4" /> Insert column left
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={anchorColIndex < 0}
            onClick={() =>
              actions.insertColumn(anchorColIndex + 1, actions.nanoid())
            }
          >
            <PlusIcon className="size-4" /> Insert column right
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!selection}
            onClick={() => selection && actions.deleteColumns(selection.colIds)}
          >
            <Trash2Icon className="size-4" /> Delete selected columns
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      <ToolButton
        label="Comment on cell"
        disabled={!selection}
        onClick={() => selection && setOpenCell(selection.anchor)}
        icon={<MessageSquarePlusIcon className="size-4" />}
      />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <HelpButton />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleChat}
              aria-label={chatOpen ? "Hide AI chat" : "Show AI chat"}
              aria-pressed={chatOpen}
            >
              {chatOpen ? (
                <PanelRightCloseIcon className="size-4" />
              ) : (
                <PanelRightOpenIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {chatOpen ? "Hide AI chat" : "Show AI chat"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 !h-5" />;
}

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  active,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ColorMenu({
  label,
  icon,
  colors,
  current,
  onSelect,
  disabled,
  resetLabel,
}: {
  label: string;
  icon: ReactNode;
  colors: string[];
  current: string | undefined;
  onSelect: (color: string | undefined) => void;
  disabled?: boolean;
  resetLabel: string;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={label}
            >
              <span className="relative flex flex-col items-center">
                {icon}
                <span
                  className="mt-0.5 h-1 w-4 rounded-full"
                  style={{ background: current ?? "transparent" }}
                />
              </span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-1 p-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => onSelect(color)}
              className="size-6 rounded-md border transition-transform hover:scale-110 active:scale-[0.96]"
              style={{ background: color }}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect(undefined)}>
          {resetLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
