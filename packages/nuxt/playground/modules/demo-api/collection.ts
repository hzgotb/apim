import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'playground-demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo',
    },
  ],
})
