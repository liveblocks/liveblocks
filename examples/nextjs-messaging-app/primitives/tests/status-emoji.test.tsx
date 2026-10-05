import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusEmoji } from "@/primitives/status-emoji";

describe("StatusEmoji", () => {
  it("renders nothing without an emoji", () => {
    const { container: noStatus } = render(<StatusEmoji status={undefined} />);
    expect(noStatus.firstChild).toBeNull();

    const { container: emptyEmoji } = render(
      <StatusEmoji status={{ emoji: null, text: "hi", away: false }} />
    );
    expect(emptyEmoji.firstChild).toBeNull();
  });

  it("renders the emoji with role img and a generic label when text is empty", () => {
    render(<StatusEmoji status={{ emoji: "🎉", text: "", away: false }} />);
    expect(screen.getByRole("img", { name: "Status" })).toHaveTextContent("🎉");
  });

  it("uses status text in the aria-label and renders it as a tooltip", () => {
    render(
      <StatusEmoji status={{ emoji: "💻", text: "Deep work", away: false }} />
    );
    const emoji = screen.getByRole("img", { name: "Status: Deep work" });
    expect(emoji).toHaveTextContent("💻");
    expect(emoji).toHaveTextContent("Deep work");
  });
});
