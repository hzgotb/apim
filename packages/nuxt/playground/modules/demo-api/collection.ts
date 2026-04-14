import { defineCallaCollection } from '@callajs/nuxt'

export default defineCallaCollection({
  name: 'playground-demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo',
    },
  ],
})
