import { describe, test, expect } from "vitest";
import { replaceReactCommentsImportsInCss } from "../react-comments-to-react-ui";

describe("replaceReactCommentsInPackageJson", () => {
  test("should update CSS imports with double quotes", () => {
    const input = `
@import "./globals.css";
@import "@liveblocks/react-comments/styles.css";
@import "@liveblocks/react-comments/styles/dark/media-query.css" screen;
@import url("@liveblocks/react-comments/styles/dark/attributes.css");

body::before {
  content: "@liveblocks/react-comments/styles.css";
}
`;
    const output = `
@import "./globals.css";
@import "@liveblocks/react-ui/styles.css";
@import "@liveblocks/react-ui/styles/dark/media-query.css" screen;
@import url("@liveblocks/react-ui/styles/dark/attributes.css");

body::before {
  content: "@liveblocks/react-comments/styles.css";
}
`;

    expect(replaceReactCommentsImportsInCss(input)).toEqual(output);
  });

  test("should update CSS imports with single quotes", () => {
    const input = `
@import './globals.css';
@import '@liveblocks/react-comments/styles.css';
@import '@liveblocks/react-comments/styles/dark/media-query.css' screen;
@import url('@liveblocks/react-comments/styles/dark/attributes.css');

body::before {
  content: '@liveblocks/react-comments/styles.css';
}
`;
    const output = `
@import './globals.css';
@import '@liveblocks/react-ui/styles.css';
@import '@liveblocks/react-ui/styles/dark/media-query.css' screen;
@import url('@liveblocks/react-ui/styles/dark/attributes.css');

body::before {
  content: '@liveblocks/react-comments/styles.css';
}
`;

    expect(replaceReactCommentsImportsInCss(input)).toEqual(output);
  });
});
