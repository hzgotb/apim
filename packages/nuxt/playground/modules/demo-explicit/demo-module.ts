import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'playground-demo-explicit',
  ignore: ['**/types/**', '**/*.types.*'],
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo-explicit',
    },
  ],
})
