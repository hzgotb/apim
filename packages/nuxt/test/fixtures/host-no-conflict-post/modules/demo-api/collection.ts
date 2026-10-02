import { defineApiModule } from '../../../../../src/collection/index'

export default defineApiModule({
  name: 'demo-api',
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
