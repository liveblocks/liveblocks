const withTM = require("next-transpile-modules")([
  "three",
  "react-three-fiber",
  "drei",
]);

module.exports = withTM({
  reactStrictMode: true,
});
