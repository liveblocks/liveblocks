import { describe, expect, test } from "vitest";

import type { CSSProperties } from "../css-properties";
import { toInlineCSSString } from "../css-properties";

describe("to inline css string", () => {
  test("should convert simple properties correctly", () => {
    const styles: CSSProperties = {
      color: "red",
      backgroundColor: "blue",
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "color:red;background-color:blue;";

    expect(inlineCSS).toBe(expected);
  });

  test("should add px to numeric properties that are not unitless", () => {
    const styles: CSSProperties = {
      margin: 0,
      padding: 0,
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "margin:0px;padding:0px;";

    expect(inlineCSS).toBe(expected);
  });

  test("should not add px to unitless properties", () => {
    const styles: CSSProperties = {
      opacity: 0.5,
      zIndex: 10,
      fontWeight: 600,
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "opacity:0.5;z-index:10;font-weight:600;";

    expect(inlineCSS).toBe(expected);
  });

  test("should handle vendor-prefixed properties correctly", () => {
    const styles: CSSProperties = {
      WebkitTransform: "rotate(45deg)",
      msFlex: 1,
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "-webkit-transform:rotate(45deg);-ms-flex:1;";

    expect(inlineCSS).toBe(expected);
  });

  test("should handle mixed properties", () => {
    const styles: CSSProperties = {
      color: "red",
      WebkitTransform: "scale(1.5)",
      margin: "20px",
      opacity: 0.7,
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected =
      "color:red;-webkit-transform:scale(1.5);margin:20px;opacity:0.7;";

    expect(inlineCSS).toBe(expected);
  });

  test("should ignore null, undefined, and boolean values", () => {
    const styles: CSSProperties = {
      color: "red",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - `null` is not a legal value, try to use it anyway
      backgroundColor: null,
      display: undefined,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - `true` is not a legal value, try to use it anyway
      visibility: true,
      opacity: 0.5,
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "color:red;opacity:0.5;";

    expect(inlineCSS).toBe(expected);
  });

  test("should ignore empty strings", () => {
    const styles: CSSProperties = {
      color: "",
      backgroundColor: "blue",
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected = "background-color:blue;";

    expect(inlineCSS).toBe(expected);
  });

  test("should handle complex vendor-prefixed properties", () => {
    const styles: CSSProperties = {
      WebkitBoxFlex: 1,
      MozBoxFlex: 2,
      msFlexDirection: "column",
    };
    const inlineCSS = toInlineCSSString(styles);
    const expected =
      "-webkit-box-flex:1;-moz-box-flex:2;-ms-flex-direction:column;";

    expect(inlineCSS).toBe(expected);
  });
});
