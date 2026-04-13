import { defineCallaCollection } from '../../../../../src/collection'

export default defineCallaCollection({
  name: 'demo-api',
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
