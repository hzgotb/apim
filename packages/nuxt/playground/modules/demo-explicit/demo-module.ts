import { defineCallaCollection } from '@callajs/nuxt'

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
