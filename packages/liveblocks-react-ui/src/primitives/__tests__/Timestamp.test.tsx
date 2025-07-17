import "@testing-library/jest-dom";

import { render } from "@testing-library/react";

import { Timestamp } from "../Timestamp";

describe("Timestamp", () => {
  const now = Date.now();

  test("should render", () => {
    const { container } = render(<Timestamp date={now} />);

    expect(container).not.toBeEmptyDOMElement();
  });

  test.todo("should have a datetime attribute");

  test.todo("should rerender at an interval");

  test.todo("should support changing the rerender interval");

  test.todo("should support a title string");

  test.todo("should support a title function");

  test.todo("should support a children function");
});
