const withTM = require("next-transpile-modules")([
  "three",
  "@react-three/fiber",
  "@react-three/drei",
]);

module.exports = withTM({
  reactStrictMode: true,
});
