module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    "custom-property-pattern": /^lb-[a-z-]+$/,
    "selector-class-pattern": /^lb-[a-z-:]+$/,
  },
};
