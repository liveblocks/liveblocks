import { Editor } from "@tiptap/react";
import { Button } from "@/primitives/Button";
import styles from "./Toolbar.module.css";
import { CommentIcon } from "@/icons";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useCreateThread } from "@/liveblocks.config";
import { Composer } from "@liveblocks/react-comments";
import {
  ComposerSubmitComment,
  ComposerSubmitProps,
} from "@liveblocks/react-comments/dist/primitives";

type Props = {
  editor: Editor;
};

const color = "coral";

export function ToolbarThread({ editor }: Props) {
  const [showComposer, setShowComposer] = useState(false);
  const createThread = useCreateThread();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showComposer) {
      return;
    }

    function hideComposer(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        wrapper.current?.contains(event.target)
      ) {
        return;
      }

      // If no thread created, remove highlight
      if (
        editor.isActive("commentHighlight") &&
        !editor.getAttributes("commentHighlight").threadId
      ) {
        editor.chain().focus().unsetCommentHighlight().run();
      }

      setShowComposer(false);
    }
    window.addEventListener("click", hideComposer);

    return () => {
      window.removeEventListener("click", hideComposer);
    };
  }, [showComposer]);

  const handleClick = useCallback(async () => {
    editor.chain().focus().setCommentHighlight({ color, threadId: null }).run();

    setTimeout(() => setShowComposer(true));
  }, [editor, showComposer]);

  const handleSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const thread = createThread({
        body: comment.body,
        metadata: {},
      });

      console.log(thread.id);
      editor
        .chain()
        .focus()
        .setCommentHighlight({ color: "purple", threadId: thread.id })
        .run();
    },
    [createThread]
  );

  return (
    <div ref={wrapper} style={{ minWidth: showComposer ? "300px" : undefined }}>
      {showComposer ? (
        <Composer onComposerSubmit={handleSubmit} />
      ) : (
        <Button
          variant="subtle"
          className={styles.toolbarButton}
          onClick={handleClick}
          disabled={editor.isActive("commentHighlight")}
          data-active={
            editor.isActive("commentHighlight") ? "is-active" : undefined
          }
          aria-label="Add comment"
        >
          <CommentIcon />
        </Button>
      )}
    </div>
  );
}
