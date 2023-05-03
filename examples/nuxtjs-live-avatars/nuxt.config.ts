// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: "vercel-edge",
  },
  app: {
    head: {
      title: "Liveblocks",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },

        { name: "robots", content: "noindex" },
        { name: "viewport", content: "width=device-width, user-scalable=no" },
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
  },
  css: ["~/assets/globals.css"],
});
