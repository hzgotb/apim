import { defineCallaCollection } from '@heyintech/sdkr-nuxt'

export default defineCallaCollection({
  name: 'playground-demo-explicit',
  ignore: ['**/types/**', '**/*.types.*'],
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo-explicit',
    },
  ],
})
