module.exports = {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order", "stylelint-plugin-logical-css"],
  rules: {
    "custom-property-pattern": /^lb-[a-z-]+$/,
    "selector-class-pattern": /^lb-[a-z-:]+$/,
    "keyframes-name-pattern": /^lb-[a-z-:]+$/,
    "selector-max-specificity": "0,1,1",
    "order/order": [
      ["dollar-variables", "custom-properties", "declarations", "rules"],
    ],
    "plugin/use-logical-properties-and-values": true,
    "plugin/use-logical-units": true,
  },
};
