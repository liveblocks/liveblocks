
import { Editor, useEditorState } from "@tiptap/react";
import CommentIcon from "./icons/comment-icon";
import { autoUpdate, ClientRectObject, hide, limitShift, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import { useCallback, useLayoutEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {
  editor: Editor | null;
};
export const FLOATING_TOOLBAR_PADDING = 10;

const getRectFromCoords = (coords: {
  top: number;
  left: number;
  right: number;
  bottom: number;
}): ClientRectObject => {
  return {
    ...coords,
    x: coords.left,
    y: coords.top,
    width: coords.right - coords.left,
    height: coords.bottom - coords.top,
  };
};
interface AiButtonProps {
  prompt: string;
  editor: Editor;
  children: React.ReactNode;
}

const AiButton = ({ children, editor, prompt }: AiButtonProps) => (
  <DropdownMenuItem>
    <button onClick={() => editor.chain().focus().doPrompt(prompt).run()} className="p-1 text-zinc-200 rounded-md hover:bg-zinc-700 text-sm transition-colors duration-200 focus:outline-none">
      {children}
    </button>
  </DropdownMenuItem>
);

export function Toolbar({ editor }: Props) {
  if (!editor) {
    return null;
  }

  const { empty, from, aiState } = useEditorState({
    editor,
    selector: (ctx) => ({
      empty: ctx.editor.view.state.selection.empty,
      from: ctx.editor.view.state.selection.from,
      aiState: ctx.editor.extensionStorage.liveblocksAi?.state
    }),
  }) ?? { empty: true, from: 0, to: 0 };

  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "top-start",
    middleware: [
      offset({
        mainAxis: 10,
        alignmentAxis: -30,
      }),
      hide({ padding: FLOATING_TOOLBAR_PADDING }),
      shift({
        padding: FLOATING_TOOLBAR_PADDING,
        limiter: limitShift(),
      }),
      size({ padding: FLOATING_TOOLBAR_PADDING }),
    ],
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        animationFrame: true,
      });
    },
  });

  const updateRef = useCallback(() => {
    if (!editor || empty || aiState !== null) {
      return;
    }
    const rect = getRectFromCoords(editor.view.coordsAtPos(from));
    setReference({
      getBoundingClientRect: () => rect,
    });
  }, [setReference, editor, from, empty]);

  const isVisible = !empty || !!aiState;

  useLayoutEffect(updateRef, [updateRef]);

  return (
    <div className="flex gap-1 z-50 duration-75 bg-zinc-800 rounded-lg border border-zinc-700 p-0.5 transition-all" ref={setFloating}
      style={{
        display: isVisible ? "flex" : "none",
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}>
      {aiState === "thinking" && <div className="flex w-full h-full items-center justify-center flex-1 p-1">
        <p>Thinking...</p>
        <img
          src="https://liveblocks.io/loading.svg"
          alt="Loading"
          className="size-8 opacity-20 invert"
        />
      </div>}
      {aiState === "waiting_for_input" && <> <button
        className="flex items-center justify-center rounded-md h-8 w-20 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
        onClick={() => editor.commands.acceptAi()}
        aria-label="accept"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 mr-1 stroke-emerald-700">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>

        Accept
      </button>
        <button
          className="flex items-center justify-center rounded-md h-8 w-20 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
          onClick={() => editor.commands.rejectAi()}
          data-active={editor.isActive("bold") ? "is-active" : undefined}
          aria-label="reject"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="size-4 mr-1 stroke-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>

          Reject
        </button>

      </>}
      {aiState === null && <><DropdownMenu >
        <DropdownMenuTrigger className="ml-1">
          <button className="flex text-zinc-200 rounded-md hover:bg-zinc-700 text-sm transition-colors duration-200 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 pt-0.5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>

            Ask Ai</button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" alignOffset={-8} sideOffset={8} className="p-1 z-50 bg-zinc-800 rounded-lg border border-zinc-700 text-zinc-200">
          <DropdownMenuLabel className=" text-zinc-500 pb-1 pl-1 ">Suggested</DropdownMenuLabel>

          <AiButton editor={editor} prompt="Improve writing">Improve writing</AiButton>
          <AiButton editor={editor} prompt="Fix spelling and grammar">Fix spelling & grammar</AiButton>
          <AiButton editor={editor} prompt="Translate to French">Translate to French</AiButton>
          <AiButton editor={editor} prompt="Translate to English">Translate to English</AiButton>

          <DropdownMenuLabel className="border-t border-zinc-700 text-zinc-500 pt-2 pb-1 pl-1 mt-2">Edit</DropdownMenuLabel>

          <AiButton editor={editor} prompt="Make shorter">Make shorter</AiButton>
          <AiButton editor={editor} prompt="Make longer">Make longer</AiButton>

        </DropdownMenuContent>
      </DropdownMenu>
        <button
          className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          data-active={editor.isActive("bold") ? "is-active" : undefined}
          aria-label="bold"
        >
          <BoldIcon />
        </button>
        <button
          className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          data-active={editor.isActive("italic") ? "is-active" : undefined}
          aria-label="italic"
        >
          <ItalicIcon />
        </button>
        <button
          className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          data-active={editor.isActive("strike") ? "is-active" : undefined}
          aria-label="strikethrough"
        >
          <StrikethroughIcon />
        </button>
        <button
          className="flex items-center justify-center rounded-md h-8 w-8 text-zinc-200 hover:bg-zinc-700 transition-colors duration-200 focus:outline-none data-[active=is-active]:bg-zinc-100 data-[active=is-active]:text-black"
          onClick={() => editor.chain().focus().addPendingComment().run()}
          data-active={editor.isActive("lb-comment") ? "is-active" : undefined}
          aria-label="strikethrough"
        >
          <CommentIcon />
        </button></>}

    </div>
  );
}

function BoldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.25 25H9V7H17.5C18.5022 7.00006 19.4834 7.28695 20.3277 7.82679C21.172 8.36662 21.8442 9.13684 22.2649 10.0465C22.6855 10.9561 22.837 11.9671 22.7015 12.96C22.5659 13.953 22.149 14.8864 21.5 15.65C22.3477 16.328 22.9645 17.252 23.2653 18.295C23.5662 19.3379 23.5364 20.4485 23.18 21.4738C22.8236 22.4991 22.1581 23.3887 21.2753 24.0202C20.3924 24.6517 19.3355 24.994 18.25 25ZM12 22H18.23C18.5255 22 18.8181 21.9418 19.091 21.8287C19.364 21.7157 19.6121 21.5499 19.821 21.341C20.0299 21.1321 20.1957 20.884 20.3087 20.611C20.4218 20.3381 20.48 20.0455 20.48 19.75C20.48 19.4545 20.4218 19.1619 20.3087 18.889C20.1957 18.616 20.0299 18.3679 19.821 18.159C19.6121 17.9501 19.364 17.7843 19.091 17.6713C18.8181 17.5582 18.5255 17.5 18.23 17.5H12V22ZM12 14.5H17.5C17.7955 14.5 18.0881 14.4418 18.361 14.3287C18.634 14.2157 18.8821 14.0499 19.091 13.841C19.2999 13.6321 19.4657 13.384 19.5787 13.111C19.6918 12.8381 19.75 12.5455 19.75 12.25C19.75 11.9545 19.6918 11.6619 19.5787 11.389C19.4657 11.116 19.2999 10.8679 19.091 10.659C18.8821 10.4501 18.634 10.2843 18.361 10.1713C18.0881 10.0582 17.7955 10 17.5 10H12V14.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25 9V7H12V9H17.14L12.77 23H7V25H20V23H14.86L19.23 9H25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.1538 14C17.3846 14.5161 17.5 15.0893 17.5 15.7196C17.5 17.0625 16.9762 18.1116 15.9286 18.867C14.8809 19.6223 13.4335 20 11.5862 20C9.94674 20 8.32335 19.6185 6.71592 18.8555V16.6009C8.23538 17.4783 9.7908 17.917 11.3822 17.917C13.9333 17.917 15.2128 17.1846 15.2208 15.7196C15.2208 15.0939 15.0049 14.5598 14.5731 14.1173C14.5339 14.0772 14.4939 14.0381 14.4531 14H3V12H21V14H17.1538ZM13.076 11H7.62908C7.4566 10.8433 7.29616 10.6692 7.14776 10.4778C6.71592 9.92084 6.5 9.24559 6.5 8.45207C6.5 7.21602 6.96583 6.165 7.89749 5.299C8.82916 4.43299 10.2706 4 12.2219 4C13.6934 4 15.1009 4.32808 16.4444 4.98426V7.13591C15.2448 6.44921 13.9293 6.10587 12.4978 6.10587C10.0187 6.10587 8.77917 6.88793 8.77917 8.45207C8.77917 8.87172 8.99709 9.23796 9.43293 9.55079C9.86878 9.86362 10.4066 10.1135 11.0463 10.3004C11.6665 10.4816 12.3431 10.7148 13.076 11H13.076Z"
        fill="currentColor"
      ></path>
    </svg>
  );
}