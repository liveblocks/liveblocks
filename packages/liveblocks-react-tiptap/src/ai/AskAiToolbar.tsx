import {
  autoUpdate,
  type DetectOverflowOptions,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
  type UseFloatingOptions,
} from "@floating-ui/react-dom";
import {
  CheckIcon,
  EmojiIcon,
  TooltipProvider,
  useRefs,
} from "@liveblocks/react-ui/_private";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { type Editor, useEditorState } from "@tiptap/react";
import type {
  ComponentProps,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "../classnames";
import { EditorProvider } from "../context";
import type { AiExtensionStorage, FloatingPosition } from "../types";
import { compareTextSelections, getDomRangeFromTextSelection } from "../utils";

export interface AskAiToolbarProps
  extends Omit<ComponentProps<"div">, "children"> {
  editor: Editor | null;
  position?: FloatingPosition;
  offset?: number;
}

export const ASK_AI_TOOLBAR_COLLISION_PADDING = 10;

//   const handleInputChange = useCallback(
//     (event: ChangeEvent<HTMLInputElement>) => {
//       setInputValue(event.target.value);
//     },
//     []
//   );

//   const handleInputKeyDown = useCallback(
//     (event: ReactKeyboardEvent<HTMLInputElement>) => {
//       if (!editor) {
//         return;
//       }

//       if (
//         event.key === "Escape" ||
//         (inputValue === "" && event.key === "Backspace")
//       ) {
//         (editor.chain() as ExtendedChainedCommands<"closeAi">)
//           .closeAi()
//           .focus()
//           .run();
//       }
//     },
//     [editor, inputValue]
//   );

//   const handleInputBlur = useCallback(() => {
//     (editor.chain() as ExtendedChainedCommands<"closeAi">).closeAi().run();
//   }, [editor]);

interface DropdownItemProps extends PropsWithChildren {
  icon?: ReactNode;
}

function DropdownItem({ children, icon }: DropdownItemProps) {
  const handleSelect = useCallback(() => {
    console.log("click");
  }, []);

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <DropdownMenu.Item
      className="lb-dropdown-item"
      onSelect={handleSelect}
      onClick={handleClick}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

function DropdownSubItem({ children, icon }: DropdownItemProps) {
  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <DropdownMenu.SubTrigger
      className="lb-dropdown-item lb-dropdown-subitem"
      onClick={handleClick}
    >
      {icon}
      {children}
      {}
    </DropdownMenu.SubTrigger>
  );
}

function DropdownLabel({ children }: PropsWithChildren) {
  return (
    <DropdownMenu.Label className="lb-dropdown-label">
      {children}
    </DropdownMenu.Label>
  );
}

export const AskAiToolbar = forwardRef<HTMLDivElement, AskAiToolbarProps>(
  (
    {
      position = "bottom",
      offset: sideOffset = 6,
      editor,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const askAiSelection =
      useEditorState({
        editor,
        selector: (ctx) => {
          return (
            ctx.editor?.storage.liveblocksAi as AiExtensionStorage | undefined
          )?.askAiSelection;
        },
        equalityFn: compareTextSelections,
      }) ?? undefined;
    const floatingOptions: UseFloatingOptions = useMemo(() => {
      const detectOverflowOptions: DetectOverflowOptions = {
        padding: ASK_AI_TOOLBAR_COLLISION_PADDING,
      };

      return {
        strategy: "fixed",
        placement: position,
        middleware: [
          inline(detectOverflowOptions),
          flip({ ...detectOverflowOptions, crossAxis: false }),
          hide(detectOverflowOptions),
          shift({
            ...detectOverflowOptions,
            limiter: limitShift(),
          }),
          offset(sideOffset),
          size(detectOverflowOptions),
        ],
        whileElementsMounted: (...args) => {
          return autoUpdate(...args, {
            animationFrame: true,
          });
        },
      };
    }, [position, sideOffset]);
    const isOpen = askAiSelection !== undefined;
    const {
      refs: { setReference, setFloating },
      strategy,
      x,
      y,
      isPositioned,
    } = useFloating({
      ...floatingOptions,
      open: isOpen,
    });
    const mergedRefs = useRefs(forwardedRef, setFloating);

    useLayoutEffect(() => {
      if (!editor || !isOpen) {
        return;
      }

      if (!askAiSelection) {
        setReference(null);
      } else {
        const domRange = getDomRangeFromTextSelection(askAiSelection, editor);

        setReference(domRange);
      }
    }, [askAiSelection, editor, isOpen, setReference]);

    if (!editor || !isOpen) {
      return null;
    }

    return createPortal(
      <TooltipProvider>
        <EditorProvider editor={editor}>
          <DropdownMenu.Root open modal={false}>
            <DropdownMenu.Trigger asChild type={undefined}>
              <div
                role="toolbar"
                aria-label="Ask AI toolbar"
                aria-orientation="horizontal"
                className={classNames(
                  "lb-root lb-portal lb-elevation lb-tiptap-ai-toolbar",
                  className
                )}
                ref={mergedRefs}
                style={{
                  position: strategy,
                  top: 0,
                  left: 0,
                  transform: isPositioned
                    ? `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
                    : "translate3d(0, -200%, 0)",
                  minWidth: "max-content",
                }}
                {...props}
              >
                <div className="lb-tiptap-ai-toolbar-input-container">
                  <input
                    type="text"
                    className="lb-tiptap-ai-toolbar-input"
                    placeholder="Ask AI anything…"
                    autoFocus
                  />
                  <EmojiIcon />
                </div>
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              side="bottom"
              sideOffset={8}
              align="start"
              collisionPadding={ASK_AI_TOOLBAR_COLLISION_PADDING}
              className="lb-root lb-portal lb-elevation lb-dropdown lb-tiptap-ai-toolbar-dropdown"
            >
              <DropdownLabel>Modify selection</DropdownLabel>
              <DropdownItem icon={<CheckIcon />}>Improve writing</DropdownItem>
              <DropdownItem icon={<CheckIcon />}>Fix mistakes</DropdownItem>
              <DropdownItem icon={<CheckIcon />}>Simplify</DropdownItem>
              <DropdownItem icon={<CheckIcon />}>Add more detail</DropdownItem>
              <DropdownLabel>Generate</DropdownLabel>
              <DropdownItem icon={<CheckIcon />}>Summarize</DropdownItem>
              <DropdownMenu.Sub>
                <DropdownSubItem icon={<CheckIcon />}>
                  Translate into…
                </DropdownSubItem>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className="lb-root lb-portal lb-elevation lb-dropdown"
                    collisionPadding={ASK_AI_TOOLBAR_COLLISION_PADDING}
                  >
                    <DropdownItem>Arabic</DropdownItem>
                    <DropdownItem>Bengali</DropdownItem>
                    <DropdownItem>Chinese</DropdownItem>
                    <DropdownItem>Dutch</DropdownItem>
                    <DropdownItem>English</DropdownItem>
                    <DropdownItem>French</DropdownItem>
                    <DropdownItem>German</DropdownItem>
                    <DropdownItem>Hindi</DropdownItem>
                    <DropdownItem>Japanese</DropdownItem>
                    <DropdownItem>Korean</DropdownItem>
                    <DropdownItem>Nepali</DropdownItem>
                    <DropdownItem>Portuguese</DropdownItem>
                    <DropdownItem>Spanish</DropdownItem>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <DropdownMenu.Sub>
                <DropdownSubItem icon={<CheckIcon />}>
                  Change style to…
                </DropdownSubItem>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    className="lb-root lb-portal lb-elevation lb-dropdown"
                    collisionPadding={ASK_AI_TOOLBAR_COLLISION_PADDING}
                  >
                    <DropdownItem>Professional</DropdownItem>
                    <DropdownItem>Straightforward</DropdownItem>
                    <DropdownItem>Friendly</DropdownItem>
                    <DropdownItem>Poetic</DropdownItem>
                    <DropdownItem>Passive aggressive</DropdownItem>
                    <DropdownItem>Pirate</DropdownItem>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <DropdownItem icon={<CheckIcon />}>Explain</DropdownItem>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </EditorProvider>
      </TooltipProvider>,
      document.body
    );
  }
);
