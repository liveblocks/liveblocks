export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: "Liveblocks",
    htmlAttrs: {
      lang: "en",
    },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { hid: "description", name: "description", content: "" },
    ],
  },
  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,
  buildModules: ["@nuxtjs/tailwindcss"],
  serverMiddleware: [{ path: "/api", handler: "~/api" }],
  publicRuntimeConfig: {
    hasLiveblocksSecretKey: process.env.LIVEBLOCKS_SECRET_KEY != null,
  },
};
