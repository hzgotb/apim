import { defineCallaCollection } from '../../../../../src/collection'

export default defineCallaCollection({
  name: 'demo-root',
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/',
    },
  ],
})
