import type { ThreadMarkNode } from "./thread-mark-node";

export default function $unwrapThreadMarkNode(node: ThreadMarkNode): void {
  const children = node.getChildren();
  let target = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (target === null) {
      node.insertBefore(child);
    } else {
      target.insertAfter(child);
    }
    target = child;
  }
  node.remove();
}
