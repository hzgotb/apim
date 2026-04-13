import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [MyModule],
  sdkr: {
    collections: ['modules/demo-api'],
    exclude: ['GET /api/profile'],
  },
})
