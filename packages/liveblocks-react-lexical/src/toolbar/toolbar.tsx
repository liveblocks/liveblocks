import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
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
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import React, { forwardRef } from "react";

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
  name: string;
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
  ({ icon, children, name, shortcut, ...props }, forwardedRef) => {
    return (
      <ShortcutTooltip content={name} shortcut={shortcut}>
        <Button type="button" variant="toolbar" ref={forwardedRef} {...props}>
          {icon}
          {children && <span className="lb-button-label">{children}</span>}
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
  ({ className, ...props }) => {
    return (
      <div
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

  return (
    <>
      <ToolbarButton
        name="Undo"
        icon={<UndoIcon />}
        shortcut="Mod-Z"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      />
      <ToolbarButton
        name="Redo"
        icon={<RedoIcon />}
        shortcut="Mod-Shift-Z"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      />
    </>
  );
}

function ToolbarSectionInline() {
  const [editor] = useLexicalComposerContext();

  return (
    <>
      <ToolbarToggle
        name="Bold"
        icon={<BoldIcon />}
        shortcut="Mod-B"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        disabled={false}
        active={false}
      />

      <ToolbarToggle
        name="Italic"
        icon={<ItalicIcon />}
        shortcut="Mod-I"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        disabled={false}
        active={false}
      />
      <ToolbarToggle
        name="Underline"
        icon={<UnderlineIcon />}
        shortcut="Mod-U"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        disabled={false}
        active={false}
      />
      <ToolbarToggle
        name="Strike"
        icon={<StrikethroughIcon />}
        shortcut="Mod-U"
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        disabled={false}
        active={false}
      />
      <ToolbarToggle
        name="Inline code"
        icon={<CodeIcon />}
        shortcut="Mod-E"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        disabled={false}
        active={false}
      />
    </>
  );
}

function ToolbarSectionCollaboration() {
  const [editor] = useLexicalComposerContext();
  return (
    <>
      <ToolbarButton
        name="Add a comment"
        icon={<CommentIcon />}
        onClick={() =>
          editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined)
        }
      >
        Comment
      </ToolbarButton>
    </>
  );
}

function DefaultToolbarContent() {
  return (
    <>
      <ToolbarSectionHistory />
      <ToolbarSeparator />
      {/* <ToolbarSectionAlignment />
      <ToolbarSeparator /> */}
      <ToolbarSectionInline />
      <ToolbarSeparator />
      <ToolbarSectionCollaboration />
    </>
  );
}

// TODO: `active`/`disabled` states for every default control
// TODO: Verify which commands are available
// TODO: Double-check keyboard shortcuts

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
    // SectionAlignment: ToolbarSectionAlignment,
    SectionInline: ToolbarSectionInline,
    SectionCollaboration: ToolbarSectionCollaboration,
  }
);
