import { sanitizeInlineCSS } from "../sanitize-inline-css";

describe("sanitize inline css", () => {
  it("should sanitize valid CSS properties and values", () => {
    const inlineCSS = "font-size: 12px; color: blue; margin: 10px;";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "font-size:12px;color:blue;margin:10px;";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should remove invalid CSS properties", () => {
    const inlineCSS = "font-size: 12px; invalid-property: value; color: blue;";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "font-size:12px;color:blue;";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle properties with valid URLs", () => {
    const inlineCSS = "background-image: url('https://example.com/image.jpg');";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "background-image:url('https://example.com/image.jpg');";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle input with valid and invalid URL properties", () => {
    const inlineCSS =
      "background-image: url('https://example.com/image.jpg'); background-image: url('javascript:alert(1)');";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "background-image:url('https://example.com/image.jpg');";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should remove properties with invalid URLs", () => {
    const inlineCSS = "background-image: url('javascript:alert(1)');";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle multiple valid and invalid properties", () => {
    const inlineCSS =
      "font-size: 12px; color: blue; background-image: url('https://example.com/image.jpg'); invalid-property: value;";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected =
      "font-size:12px;color:blue;background-image:url('https://example.com/image.jpg');";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle input with only invalid properties", () => {
    const inlineCSS = "invalid-property: value; another-invalid: value;";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should remove dangerous characters from values", () => {
    const inlineCSS =
      "font-size: 12px; color: blue; content: 'hello<script>alert(1)</script>';";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "font-size:12px;color:blue;";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle input with mixed valid and invalid characters in values", () => {
    const inlineCSS =
      "font-size: 12px; color: blue; content: 'hello<script>alert(1)</script>'; background-image: url('https://example.com/image.jpg');";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected =
      "font-size:12px;color:blue;background-image:url('https://example.com/image.jpg');";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle CSS with colons in values correctly", () => {
    const inlineCSS =
      "font-family: 'Times New Roman', serif; background-image: url('https://example.com/image.jpg');";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected =
      "font-family:Times New Roman, serif;background-image:url('https://example.com/image.jpg');";

    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle CSS with multiple colons in values correctly", () => {
    const inlineCSS =
      "background: url('https://example.com/image.jpg') no-repeat center center;";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected =
      "background:url('https://example.com/image.jpg') no-repeat center center;";
    expect(sanitizedInlineCSS).toBe(expected);
  });

  it("should handle CSS with special characters in values correctly", () => {
    const inlineCSS = "content: 'Hello, world!';";

    const sanitizedInlineCSS = sanitizeInlineCSS(inlineCSS);
    const expected = "";

    expect(sanitizedInlineCSS).toBe(expected);
  });
});
