import { getQuery, type H3Event } from 'h3'

export interface CallaMeta {
  query: {
    name?: string
  }
  res: {
    message: string
    source: string
  }
}

export default defineEventHandler((event: H3Event) => {
  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : 'calla'

  return {
    message: `Hello, ${name}!`,
    source:
      'packages/nuxt/playground/modules/demo-api/runtime/server/profile.get.ts',
  } satisfies CallaMeta['res']
})
