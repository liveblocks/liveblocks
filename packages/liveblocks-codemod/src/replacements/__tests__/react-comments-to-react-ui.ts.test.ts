import {
  replaceReactCommentsImportsInCss,
  replaceReactCommentsInPackageJson,
} from "../react-comments-to-react-ui";

describe("replaceReactCommentsInPackageJson", () => {
  it("should update package.json files with double quotes", () => {
    const input = `
{
  "name": "@liveblocks/react-comments",
  "version": "1.0.0",
  "author": "Your Name <email@example.com>",
  "dependencies": {
    "@liveblocks/react-comments": "^1.12.0"
  },
  "devDependencies": {
    "@liveblocks/react": "^1.12.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
`;
    const output = `
{
  "name": "@liveblocks/react-comments",
  "version": "1.0.0",
  "author": "Your Name <email@example.com>",
  "dependencies": {
    "@liveblocks/react-ui": "^1.12.0"
  },
  "devDependencies": {
    "@liveblocks/react": "^1.12.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
`;

    expect(replaceReactCommentsInPackageJson(input)).toEqual(output);
  });

  it("should update package.json files with single quotes", () => {
    const input = `
{
  'name': '@liveblocks/react-comments',
  'version': '1.0.0',
  'author': 'Your Name <email@example.com>',
  'dependencies': {
    '@liveblocks/react-comments': '^1.12.0'
  },
  'devDependencies': {
    '@liveblocks/react': '^1.12.0'
  },
  'peerDependencies': {
    'react': '^19.0.0'
  }
}
`;
    const output = `
{
  'name': '@liveblocks/react-comments',
  'version': '1.0.0',
  'author': 'Your Name <email@example.com>',
  'dependencies': {
    '@liveblocks/react-ui': '^1.12.0'
  },
  'devDependencies': {
    '@liveblocks/react': '^1.12.0'
  },
  'peerDependencies': {
    'react': '^19.0.0'
  }
}
`;

    expect(replaceReactCommentsInPackageJson(input)).toEqual(output);
  });
});

describe("replaceReactCommentsInPackageJson", () => {
  it("should update CSS imports with double quotes", () => {
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

  it("should update CSS imports with single quotes", () => {
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
