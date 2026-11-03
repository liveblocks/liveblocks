import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SignIn } from "@/features/users";
import { getUsers } from "@/lib/database";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("SignIn", () => {
  it("lists all demo users with names and ids", () => {
    render(<SignIn onSignIn={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Sign in", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Demo accounts" })
    ).toBeInTheDocument();

    for (const user of getUsers()) {
      expect(screen.getByText(user.info.name)).toBeInTheDocument();
      expect(screen.getByText(user.id)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button")).toHaveLength(getUsers().length);
  });

  it("calls onSignIn, disables buttons, and marks the clicked one busy while pending", async () => {
    const user = userEvent.setup();
    const pending = deferred<void>();
    const onSignIn = vi.fn(() => pending.promise);
    render(<SignIn onSignIn={onSignIn} />);

    const target = getUsers()[2];
    const targetButton = screen.getByRole("button", {
      name: new RegExp(target.info.name, "i"),
    });

    await user.click(targetButton);

    expect(onSignIn).toHaveBeenCalledWith(target.id);
    expect(targetButton).toHaveAttribute("aria-busy", "true");

    for (const demoUser of getUsers()) {
      const button = screen.getByRole("button", {
        name: new RegExp(demoUser.info.name, "i"),
      });
      expect(button).toBeDisabled();
    }

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("shows a rejected sign-in in an alert and re-enables buttons", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn(() => Promise.reject(new Error("Sign-in failed")));
    render(<SignIn onSignIn={onSignIn} />);

    const target = getUsers()[0];
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(target.info.name, "i"),
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in failed"
    );

    for (const demoUser of getUsers()) {
      const button = screen.getByRole("button", {
        name: new RegExp(demoUser.info.name, "i"),
      });
      expect(button).not.toBeDisabled();
    }
  });
});
