import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PanelWidthConfig } from "@/lib/panel-width";
import { ResizeHandle } from "@/primitives/resize-handle";

const CONFIG: PanelWidthConfig = {
  storageKey: "test:resize-handle",
  defaultWidth: 300,
  minWidth: 200,
  maxWidth: 500,
};

function renderHandle(edge: "left" | "right", width = 300) {
  const onWidthChange = vi.fn();
  render(
    <ResizeHandle
      edge={edge}
      width={width}
      config={CONFIG}
      label="Resize panel"
      onWidthChange={onWidthChange}
    />
  );
  return { handle: screen.getByRole("separator"), onWidthChange };
}

function drag(handle: HTMLElement, from: number, to: number[]) {
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: from });
  for (const clientX of to) {
    fireEvent.pointerMove(handle, { pointerId: 1, clientX });
  }
}

describe("ResizeHandle", () => {
  afterEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("exposes the width range as a vertical separator", () => {
    const { handle } = renderHandle("right", 320);
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAccessibleName("Resize panel");
    expect(handle).toHaveAttribute("aria-valuenow", "320");
    expect(handle).toHaveAttribute("aria-valuemin", "200");
    expect(handle).toHaveAttribute("aria-valuemax", "500");
  });

  it("grows a right-edge panel when dragged to the right", () => {
    const { handle, onWidthChange } = renderHandle("right");
    drag(handle, 100, [140, 160]);
    expect(onWidthChange).toHaveBeenNthCalledWith(1, 340);
    expect(onWidthChange).toHaveBeenNthCalledWith(2, 360);
  });

  it("grows a left-edge panel when dragged to the left", () => {
    const { handle, onWidthChange } = renderHandle("left");
    drag(handle, 100, [60]);
    expect(onWidthChange).toHaveBeenCalledWith(340);
  });

  it("locks the cursor while dragging and stops after pointer up", () => {
    const { handle, onWidthChange } = renderHandle("right");
    drag(handle, 100, [120]);
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");

    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 200 });
    expect(onWidthChange).toHaveBeenCalledTimes(1);
  });

  it("ignores non-primary buttons and foreign pointers", () => {
    const { handle, onWidthChange } = renderHandle("right");
    fireEvent.pointerDown(handle, { pointerId: 1, button: 2, clientX: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150 });
    expect(onWidthChange).not.toHaveBeenCalled();

    drag(handle, 100, []);
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 150 });
    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it("resizes with the keyboard", async () => {
    const user = userEvent.setup();
    const { handle, onWidthChange } = renderHandle("right");
    handle.focus();
    await user.keyboard("{ArrowRight}");
    expect(onWidthChange).toHaveBeenLastCalledWith(316);
    await user.keyboard("{ArrowLeft}");
    expect(onWidthChange).toHaveBeenLastCalledWith(284);
    await user.keyboard("{Home}");
    expect(onWidthChange).toHaveBeenLastCalledWith(200);
    await user.keyboard("{End}");
    expect(onWidthChange).toHaveBeenLastCalledWith(500);
  });

  it("flips the arrow keys for a left-edge panel", async () => {
    const user = userEvent.setup();
    const { handle, onWidthChange } = renderHandle("left");
    handle.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onWidthChange).toHaveBeenLastCalledWith(316);
    await user.keyboard("{ArrowRight}");
    expect(onWidthChange).toHaveBeenLastCalledWith(284);
  });

  it("resets to the default width on double-click", async () => {
    const user = userEvent.setup();
    const { handle, onWidthChange } = renderHandle("right", 450);
    await user.dblClick(handle);
    expect(onWidthChange).toHaveBeenLastCalledWith(300);
  });
});
