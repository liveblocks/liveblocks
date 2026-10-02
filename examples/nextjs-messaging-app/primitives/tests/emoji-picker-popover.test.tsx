import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmojiPickerPopover } from "@/primitives/emoji-picker-popover";

vi.mock("frimousse", () => ({
  EmojiPicker: {
    Root: ({
      children,
      onEmojiSelect,
    }: {
      children: React.ReactNode;
      onEmojiSelect: (value: { emoji: string }) => void;
    }) => (
      <div data-testid="emoji-picker-root">
        {children}
        <button type="button" onClick={() => onEmojiSelect({ emoji: "🎉" })}>
          Pick party emoji
        </button>
      </div>
    ),
    Search: () => null,
    Viewport: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Loading: () => null,
    Empty: () => null,
    List: () => null,
  },
}));

describe("EmojiPickerPopover", () => {
  it("renders the trigger child", () => {
    render(
      <EmojiPickerPopover onSelect={vi.fn()}>
        <button type="button">Open emoji picker</button>
      </EmojiPickerPopover>
    );
    expect(
      screen.getByRole("button", { name: "Open emoji picker" })
    ).toBeInTheDocument();
  });

  it("opens the picker, selects an emoji, and closes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <EmojiPickerPopover onSelect={onSelect}>
        <button type="button">Open emoji picker</button>
      </EmojiPickerPopover>
    );

    await user.click(screen.getByRole("button", { name: "Open emoji picker" }));
    expect(screen.getByTestId("emoji-picker-root")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pick party emoji" }));
    expect(onSelect).toHaveBeenCalledWith("🎉");
    expect(screen.queryByTestId("emoji-picker-root")).not.toBeInTheDocument();
  });

  it("notifies onOpenChange when visibility changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <EmojiPickerPopover onSelect={vi.fn()} onOpenChange={onOpenChange}>
        <button type="button">Open emoji picker</button>
      </EmojiPickerPopover>
    );

    await user.click(screen.getByRole("button", { name: "Open emoji picker" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Pick party emoji" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
