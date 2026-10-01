import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [MyModule],
  apim: {
    collections: ['modules/demo-api'],
    exclude: ['GET /api/profile'],
  },
})
