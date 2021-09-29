export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'nuxt-js-examples',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,
  
  buildModules: ['@nuxtjs/tailwindcss'],

  serverMiddleware: [{ path: '/api', handler: '~/api' }],

  env: {
    hasLiveblocksSecretKey: process.env.LIVEBLOCKS_SECRET_KEY != null
  }
}
