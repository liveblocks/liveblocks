import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  BoldIcon,
  Button,
  CodeIcon,
  CommentIcon,
  ItalicIcon,
  RedoIcon,
  ShortcutTooltip,
  StrikethroughIcon,
  TooltipProvider,
  UnderlineIcon,
  UndoIcon,
} from "@liveblocks/react-ui/_private";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from "lexical";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import React, { forwardRef, useEffect, useState } from "react";

import { classNames } from "../classnames";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "../comments/floating-composer";

export interface ToolbarSlotProps {
  editor: LexicalEditor;
}

export type ToolbarSlot = ReactNode | ComponentType<ToolbarSlotProps>;

export interface ToolbarProps extends Omit<ComponentProps<"div">, "children"> {
  children?: ToolbarSlot;
  leading?: ToolbarSlot;
  trailing?: ToolbarSlot;
}

interface ToolbarButtonProps extends ComponentProps<"button"> {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
}

interface ToolbarToggleProps extends ToolbarButtonProps {
  active: boolean;
}

type ToolbarSeparatorProps = ComponentProps<"div">;

export function applyToolbarSlot(
  slot: ToolbarSlot,
  props: ToolbarSlotProps
): ReactNode {
  if (typeof slot === "function") {
    const Component = slot;

    return <Component {...props} />;
  }

  return slot;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon, children, label, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={label} shortcut={shortcut}>
        <Button
          type="button"
          variant="toolbar"
          ref={forwardedRef}
          icon={icon}
          {...props}
        >
          {children}
        </Button>
      </ShortcutTooltip>
    );
  }
);

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>(
  ({ active, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root asChild pressed={active}>
        <ToolbarButton ref={forwardedRef} {...props} />
      </TogglePrimitive.Root>
    );
  }
);

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role="separator"
        aria-orientation="vertical"
        className={classNames("lb-lexical-toolbar-separator", className)}
        {...props}
      />
    );
  }
);

function ToolbarSectionHistory() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );

    return unregister;
  }, [editor]);

  return (
    <>
      <ToolbarButton
        label="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
      />
      <ToolbarButton
        label="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
      />
    </>
  );
}

function isFormatActive(editor: LexicalEditor, format: TextFormatType) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      return false;
    }

    return selection.hasFormat(format);
  });
}

function ToolbarSectionInline() {
  const [editor] = useLexicalComposerContext();
  const supportsTextFormat = editor._commands.has(FORMAT_TEXT_COMMAND);

  return supportsTextFormat ? (
    <>
      <ToolbarToggle
        label="Bold"
        icon={<BoldIcon />}
        shortcut="Mod-B"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        active={isFormatActive(editor, "bold")}
      />

      <ToolbarToggle
        label="Italic"
        icon={<ItalicIcon />}
        shortcut="Mod-I"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        active={isFormatActive(editor, "italic")}
      />
      <ToolbarToggle
        label="Underline"
        icon={<UnderlineIcon />}
        shortcut="Mod-U"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        active={isFormatActive(editor, "underline")}
      />
      <ToolbarToggle
        label="Strikethrough"
        icon={<StrikethroughIcon />}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        active={isFormatActive(editor, "strikethrough")}
      />
      <ToolbarToggle
        label="Inline code"
        icon={<CodeIcon />}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        active={isFormatActive(editor, "code")}
      />
    </>
  ) : null;
}

function ToolbarSectionCollaboration() {
  const [editor] = useLexicalComposerContext();
  const supportsThread = editor._commands.has(OPEN_FLOATING_COMPOSER_COMMAND);

  return (
    <>
      {supportsThread ? (
        <ToolbarButton
          label="Add a comment"
          icon={<CommentIcon />}
          onClick={() =>
            editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined)
          }
        >
          Comment
        </ToolbarButton>
      ) : null}
    </>
  );
}

function DefaultToolbarContent({ editor }: ToolbarSlotProps) {
  const supportsTextFormat = editor._commands.has(FORMAT_TEXT_COMMAND);
  const supportsThread = editor._commands.has(OPEN_FLOATING_COMPOSER_COMMAND);

  return (
    <>
      <ToolbarSectionHistory />
      {supportsTextFormat ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionInline />
        </>
      ) : null}
      {supportsThread ? (
        <>
          <ToolbarSeparator />
          <ToolbarSectionCollaboration />
        </>
      ) : null}
    </>
  );
}

// TODO: Somehow the non-floating toolbar only shows the undo/redo buttons

export const Toolbar = Object.assign(
  forwardRef<HTMLDivElement, ToolbarProps>(
    (
      {
        leading,
        trailing,
        children = DefaultToolbarContent,
        className,
        ...props
      },
      forwardedRef
    ) => {
      const [editor] = useLexicalComposerContext();

      const slotProps: ToolbarSlotProps = { editor };

      return (
        <TooltipProvider>
          <div
            ref={forwardedRef}
            role="toolbar"
            aria-label="Toolbar"
            aria-orientation="horizontal"
            className={classNames("lb-root lb-lexical-toolbar", className)}
            {...props}
          >
            {applyToolbarSlot(leading, slotProps)}
            {applyToolbarSlot(children, slotProps)}
            {applyToolbarSlot(trailing, slotProps)}
          </div>
        </TooltipProvider>
      );
    }
  ),
  {
    Button: ToolbarButton,
    Toggle: ToolbarToggle,
    Separator: ToolbarSeparator,
    SectionHistory: ToolbarSectionHistory,
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
  }
);
