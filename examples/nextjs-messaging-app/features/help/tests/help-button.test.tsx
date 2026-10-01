import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HelpButton } from "@/features/help";

describe("HelpButton", () => {
  it("does not render the modal initially", () => {
    render(<HelpButton />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal with its title", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    await user.click(
      screen.getByRole("button", { name: "How to use this example" })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Messaging App" })
    ).toBeInTheDocument();
    expect(screen.getByText("How to use this example")).toBeInTheDocument();
  });

  it("closes when clicking the close button", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    await user.click(
      screen.getByRole("button", { name: "How to use this example" })
    );
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when pressing Escape", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    await user.click(
      screen.getByRole("button", { name: "How to use this example" })
    );
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when clicking the backdrop", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);

    await user.click(
      screen.getByRole("button", { name: "How to use this example" })
    );
    await user.click(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
