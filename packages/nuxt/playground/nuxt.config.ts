export default defineNuxtConfig({
  modules: ['@callajs/nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  calla: {
    injectCallaToGlobal: true,
    collections: [
      'modules/demo-api',
      'modules/demo-explicit/demo-module.ts',
    ],
  },
})
