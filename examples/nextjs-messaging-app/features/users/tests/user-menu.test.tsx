import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/features/users";
import { getUser, getUsers } from "@/lib/database";

const CHARLIE = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";

describe("UserMenu", () => {
  it("labels the trigger with the signed-in user", () => {
    render(
      <UserMenu userId={CHARLIE} onUserChange={vi.fn()} onSignOut={null} />
    );

    expect(
      screen.getByRole("button", {
        name: `Signed in as ${getUser(CHARLIE)!.info.name}. Switch user`,
      })
    ).toBeInTheDocument();
  });

  it("opens a listbox with the current user selected", async () => {
    const user = userEvent.setup();
    render(
      <UserMenu userId={CHARLIE} onUserChange={vi.fn()} onSignOut={null} />
    );

    await user.click(
      screen.getByRole("button", {
        name: new RegExp("signed in as charlie layne", "i"),
      })
    );

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    for (const demoUser of getUsers()) {
      const option = screen.getByRole("option", {
        name: new RegExp(demoUser.info.name, "i"),
      });
      if (demoUser.id === CHARLIE) {
        expect(option).toHaveAttribute("aria-selected", "true");
      } else {
        expect(option).toHaveAttribute("aria-selected", "false");
      }
    }
  });

  it("calls onUserChange and closes when an option is chosen", async () => {
    const user = userEvent.setup();
    const onUserChange = vi.fn();
    render(
      <UserMenu userId={CHARLIE} onUserChange={onUserChange} onSignOut={null} />
    );

    await user.click(
      screen.getByRole("button", {
        name: new RegExp("signed in as charlie layne", "i"),
      })
    );
    await user.click(screen.getByRole("option", { name: /mislav abha/i }));

    expect(onUserChange).toHaveBeenCalledWith(MISLAV);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders Sign out only when onSignOut is provided", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    const { rerender } = render(
      <UserMenu userId={CHARLIE} onUserChange={vi.fn()} />
    );

    await user.click(
      screen.getByRole("button", {
        name: new RegExp("signed in as charlie layne", "i"),
      })
    );
    expect(
      screen.queryByRole("button", { name: "Sign out" })
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    rerender(
      <UserMenu userId={CHARLIE} onUserChange={vi.fn()} onSignOut={onSignOut} />
    );
    await user.click(
      screen.getByRole("button", {
        name: new RegExp("signed in as charlie layne", "i"),
      })
    );
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <UserMenu userId={CHARLIE} onUserChange={vi.fn()} onSignOut={null} />
    );

    await user.click(
      screen.getByRole("button", {
        name: new RegExp("signed in as charlie layne", "i"),
      })
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
