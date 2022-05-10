export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: "Liveblocks",
    htmlAttrs: {
      lang: "en",
    },
    meta: [
      { charset: "utf-8" },

      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "https://liveblocks.io/favicon-16x16.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "https://liveblocks.io/favicon-32x32.png",
      },
    ],
  },
  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,
  buildModules: ["@nuxtjs/tailwindcss"],
  serverMiddleware: [{ path: "/api", handler: "~/api" }],
  generate: {
    routes: ["/"],
  },
};
