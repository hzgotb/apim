import { defineCallaCollection } from '@heyintech/sdkr-nuxt'

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
