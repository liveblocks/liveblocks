module.exports = {
  launch: {
    headless: process.env.CI ? true : false,
    product: "chrome",
  },
  browserContext: "default",
};
