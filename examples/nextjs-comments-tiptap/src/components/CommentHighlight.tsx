import TaskItem from "@tiptap/extension-task-item";
import {
  Node,
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { Checkbox } from "@/primitives/Checkbox";
import styles from "./CommentHighlight.module.css";
import { mergeAttributes } from "@tiptap/core";

// declare module "@tiptap/core" {
//   interface Commands<ReturnType> {
//     commentHighlight: {
//       /**
//        * Set a highlight mark
//        */
//       setCommentHighlight: (attributes?: { color: string }) => ReturnType;
//       /**
//        * Toggle a highlight mark
//        */
//       toggleCommentHighlight: (attributes?: { color: string }) => ReturnType;
//       /**
//        * Unset a highlight mark
//        */
//       unsetCommentHighlight: () => ReturnType;
//     };
//   }
// }

// A custom task item that uses the checkbox primitive
export const CommentsHighlight = Node.create({
  name: "commentHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addCommands() {
    return {
      // setCommentHighlight:
      //   (attributes) =>
      //   ({ commands }) => {
      //     return commands.setNode(this.name, attributes);
      //   },
      toggleCommentHighlight:
        (attributes) =>
        ({ commands }) => {
          console.log("here");
          return commands.wrapIn(this.name, attributes);
        },
      // unsetCommentHighlight:
      //   () =>
      //   ({ commands }) => {
      //     return commands.unsetNode(this.name);
      //   },
    };
  },

  parseHTML() {
    return [
      {
        tag: "react-component",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["react-component", mergeAttributes(HTMLAttributes)];
  },

  // addNodeView: () => {
  //   return ReactNodeViewRenderer(CommentHighlight);
  // },

  //content: "inline",
});

function CommentHighlight({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper className={styles.commentHighlight}>
      <label className={styles.tiptipTaskItemCheckbox} contentEditable={false}>
        <Checkbox
          initialValue={false}
          checked={node.attrs.checked}
          onValueChange={(checked: boolean) => updateAttributes({ checked })}
        />
      </label>
      <NodeViewContent className={styles.tiptipTaskItemContent} />
    </NodeViewWrapper>
  );
}
