import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColumnHeader } from "@/primitives/column-header";

describe("ColumnHeader", () => {
  it("renders the title", () => {
    render(<ColumnHeader title="Direct messages" />);
    expect(
      screen.getByRole("heading", { name: "Direct messages" })
    ).toBeInTheDocument();
  });

  it("renders children actions", () => {
    render(
      <ColumnHeader title="Channels">
        <button type="button">Add channel</button>
      </ColumnHeader>
    );

    expect(
      screen.getByRole("heading", { name: "Channels" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add channel" })
    ).toBeInTheDocument();
  });
});
