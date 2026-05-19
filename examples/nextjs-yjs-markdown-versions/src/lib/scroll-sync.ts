import type { editor } from "monaco-editor";

/**
 * Two-way line-anchored scroll synchronizer for a pair of Monaco editors.
 *
 * The simplest sync — mirror `scrollTop` — drifts whenever Monaco's
 * `DiffEditor` inserts an alignment view zone on its modified side (so
 * that deleted-from-original lines show up as visual gaps). The two
 * editors then have different *layout* heights even though they display
 * the same source text.
 *
 * Instead, we anchor on the topmost visible logical line of the
 * source editor and place the same line at the same viewport-relative
 * pixel offset in the destination editor — using `getTopForLineNumber`
 * which already accounts for view zones, line wrapping, padding, etc.
 *
 *     anchorViewportY = sourceTopForLine(L) - source.scrollTop
 *     destination.scrollTop = destinationTopForLine(L) - anchorViewportY
 *
 * Horizontal scroll is mirrored as-is.
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

    // Seed the right editor's position from the left.
    this.mirror(left, right);

    this.leftDisposer = left.onDidScrollChange(() => {
      if (this.propagating) return;
      this.propagating = true;
      try {
        this.mirror(left, right);
      } finally {
        this.propagating = false;
      }
    });

    this.rightDisposer = right.onDidScrollChange(() => {
      if (this.propagating) return;
      this.propagating = true;
      try {
        this.mirror(right, left);
      } finally {
        this.propagating = false;
      }
    });
  }

  private mirror(source: editor.ICodeEditor, dest: editor.ICodeEditor) {
    const visibleRanges = source.getVisibleRanges();
    if (visibleRanges.length === 0) {
      // No content visible (e.g. mid-layout) — fall back to a raw scrollTop
      // mirror so we don't get stuck at 0.
      dest.setScrollTop(source.getScrollTop());
      dest.setScrollLeft(source.getScrollLeft());
      return;
    }

    const anchorLine = visibleRanges[0].startLineNumber;
    const sourceTopForLine = source.getTopForLineNumber(anchorLine);
    const sourceScrollTop = source.getScrollTop();
    // How many pixels above the editor's top edge the anchor line sits
    // (positive when the line has scrolled above the viewport).
    const anchorViewportY = sourceTopForLine - sourceScrollTop;

    const destTopForLine = dest.getTopForLineNumber(anchorLine);
    const target = destTopForLine - anchorViewportY;
    // Avoid micro-jitter from sub-pixel rounding.
    if (Math.abs(target - dest.getScrollTop()) > 0.5) {
      dest.setScrollTop(target);
    }
    dest.setScrollLeft(source.getScrollLeft());
  }
}
