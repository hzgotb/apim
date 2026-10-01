import { defineApiModule } from '../../../../../src/collection/index'

export default defineApiModule({
  name: 'demo-api',
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
