export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  apim: {
    injectApimToGlobal: true,
    collections: ['modules/demo-api', 'modules/demo-explicit/demo-module.ts'],
  },
})
