"use client";

import type { LiveTextData } from "@liveblocks/client";
import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import type { FormatKey, SelectionRange } from "./live-text-formatting";
import { isSelectionFormatted } from "./live-text-formatting";

// Undo/redo, inline formatting toggles, and an avatar stack showing who is in the room
export function Toolbar({
  text,
  selection,
  historyBatchActive,
  onHistoryAction,
  onToggleFormat,
}: {
  text: LiveTextData;
  selection: SelectionRange | null;
  historyBatchActive: boolean;
  onHistoryAction: () => void;
  onToggleFormat: (key: FormatKey) => void;
}) {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div className="toolbar">
      <ToolbarButton
        label="Undo"
        disabled={!canUndo && !historyBatchActive}
        onPress={() => {
          onHistoryAction();
          undo();
        }}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!canRedo}
        onPress={() => {
          onHistoryAction();
          redo();
        }}
      >
        <RedoIcon />
      </ToolbarButton>
      <div className="toolbar-divider" />
      <FormatButton
        label="Bold"
        active={isSelectionFormatted(text, selection, "bold")}
        onToggle={() => onToggleFormat("bold")}
      >
        <BoldIcon />
      </FormatButton>
      <FormatButton
        label="Italic"
        active={isSelectionFormatted(text, selection, "italic")}
        onToggle={() => onToggleFormat("italic")}
      >
        <ItalicIcon />
      </FormatButton>
      <FormatButton
        label="Strikethrough"
        active={isSelectionFormatted(text, selection, "strikethrough")}
        onToggle={() => onToggleFormat("strikethrough")}
      >
        <StrikethroughIcon />
      </FormatButton>
      <AvatarStack className="avatars" size={32} />
    </div>
  );
}

function FormatButton({
  label,
  active,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`toolbar-button${active ? " active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      // Prevent the button from stealing focus from the editor
      onPointerDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}

function ToolbarButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="toolbar-button"
      aria-label={label}
      disabled={disabled}
      // Prevent the button from stealing focus from the editor
      onPointerDown={(event) => event.preventDefault()}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

function UndoIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1={19} x2={10} y1={4} y2={4} />
      <line x1={14} x2={5} y1={20} y2={20} />
      <line x1={15} x2={9} y1={4} y2={20} />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1={4} x2={20} y1={12} y2={12} />
    </svg>
  );
}
