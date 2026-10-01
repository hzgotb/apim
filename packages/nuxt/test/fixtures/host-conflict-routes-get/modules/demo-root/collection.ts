import { defineApiModule } from '../../../../../src/collection/index'

export default defineApiModule({
  name: 'demo-root',
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/',
    },
  ],
})
