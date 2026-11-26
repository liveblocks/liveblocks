// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HelpButton } from "../help-button";

describe("HelpButton", () => {
  it("opens a dialog listing what the example does, and Escape closes it", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "How to use this example" })
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("AI slide proposals");
    expect(dialog).toHaveTextContent("Comments and export");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
