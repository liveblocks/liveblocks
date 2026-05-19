import type { editor } from "monaco-editor";

/**
 * Two-way scroll synchronizer for a pair of Monaco editors.
 *
 * Used by `EditorCarousel` to keep the LEFT DiffEditor's modified pane and
 * the RIGHT plain Monaco editor aligned vertically (and horizontally) when
 * the user scrolls either one. Both editors show the same focused version,
 * so mirroring `scrollTop` / `scrollLeft` lines them up by line.
 *
 * Each side is registered independently (via `setLeft` / `setRight`) so
 * panel components can plug in and out without the carousel having to know
 * about the editor lifecycle.
 */
export class ScrollSync {
  private left: editor.ICodeEditor | null = null;
  private right: editor.ICodeEditor | null = null;
  private leftDisposer: { dispose(): void } | null = null;
  private rightDisposer: { dispose(): void } | null = null;
  private propagating = false;

  setLeft(editor: editor.ICodeEditor | null) {
    if (this.left === editor) return;
    this.left = editor;
    this.rewire();
  }

  setRight(editor: editor.ICodeEditor | null) {
    if (this.right === editor) return;
    this.right = editor;
    this.rewire();
  }

  dispose() {
    this.leftDisposer?.dispose();
    this.rightDisposer?.dispose();
    this.leftDisposer = null;
    this.rightDisposer = null;
    this.left = null;
    this.right = null;
  }

  private rewire() {
    this.leftDisposer?.dispose();
    this.rightDisposer?.dispose();
    this.leftDisposer = null;
    this.rightDisposer = null;

    const left = this.left;
    const right = this.right;
    if (!left || !right) return;

    // Seed the right with the left's current position so they start aligned.
    right.setScrollTop(left.getScrollTop());
    right.setScrollLeft(left.getScrollLeft());

    this.leftDisposer = left.onDidScrollChange(() => {
      if (this.propagating) return;
      this.propagating = true;
      try {
        right.setScrollTop(left.getScrollTop());
        right.setScrollLeft(left.getScrollLeft());
      } finally {
        this.propagating = false;
      }
    });

    this.rightDisposer = right.onDidScrollChange(() => {
      if (this.propagating) return;
      this.propagating = true;
      try {
        left.setScrollTop(right.getScrollTop());
        left.setScrollLeft(right.getScrollLeft());
      } finally {
        this.propagating = false;
      }
    });
  }
}
