module.exports = {
  ...require("@liveblocks/jest-config"),

  // https://github.com/ai/nanoid/issues/363#issuecomment-1140906651
  transformIgnorePatterns: [`/node_modules/(?!nanoid)`],
  moduleNameMapper: {
    "^nanoid(/(.*)|$)": "nanoid$1",
  },
};
