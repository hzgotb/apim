import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'playground-demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo',
    },
  ],
})
