import { getQuery, type H3Event } from 'h3'

export interface ApiModuleMeta {
  query: {
    tag?: string
  }
  res: {
    message: string
    entry: string
    route: string
  }
}

export default defineEventHandler((event: H3Event) => {
  const query = getQuery(event)
  const tag = typeof query.tag === 'string' ? query.tag : 'explicit-ts-file'

  return {
    message: `Loaded via explicit collection file: ${tag}`,
    entry: 'packages/nuxt/playground/modules/demo-explicit/demo-module.ts',
    route: '/demo-explicit/status',
  } satisfies ApiModuleMeta['res']
})
