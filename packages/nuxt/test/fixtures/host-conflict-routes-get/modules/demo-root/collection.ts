import { defineApiModule } from '../../../../../src/collection/index'

export default defineApiModule({
  name: 'demo-root',
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/',
    },
  ],
})
