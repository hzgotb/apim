import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [MyModule],
  calla: {
    collections: ['modules/demo-api'],
    exclude: ['GET /api/profile'],
  },
})
