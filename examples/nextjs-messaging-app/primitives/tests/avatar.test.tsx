import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getUser } from "@/lib/database";
import { Avatar } from "@/primitives/avatar";

describe("Avatar", () => {
  it("renders the user's avatar as a decorative image", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");
    render(<Avatar user={user} size="lg" />);
    const image = document.querySelector("img");
    expect(image).toHaveAttribute("src", user.info.avatar);
    expect(image).toHaveAttribute("alt", "");
  });

  it("renders fallback avatar when user is undefined", () => {
    const { container } = render(<Avatar user={undefined} size="lg" />);
    const root = container.firstElementChild;
    const image = container.querySelector("img");
    expect(root).toHaveClass("bg-neutral-200");
    expect(image).toBeInTheDocument();
  });

  it("renders a presence dot only when online is boolean", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");
    const { rerender } = render(<Avatar user={user} size="lg" />);
    expect(screen.queryByLabelText("Online")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Offline")).not.toBeInTheDocument();

    rerender(<Avatar user={user} size="lg" online />);
    expect(screen.getByLabelText("Online")).toBeInTheDocument();

    rerender(<Avatar user={user} size="lg" online={false} />);
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });

  it("applies different classes for size variants", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");

    const { container, rerender } = render(<Avatar user={user} size="sm" />);
    expect(container.firstElementChild).toHaveClass("size-5", "rounded");
    expect(container.querySelector("img")).toHaveClass("rounded");

    rerender(<Avatar user={user} size="lg" />);
    expect(container.firstElementChild).toHaveClass("size-9", "rounded-md");
    expect(container.querySelector("img")).toHaveClass("rounded-md");
  });
});
