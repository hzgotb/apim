import { defineEventHandler, getQuery } from 'h3'

/**
 * 当前 handler 的静态请求与响应契约。
 *
 * - `body`：请求体类型。
 * - `query`：查询参数类型。
 * - `res`：成功响应类型。
 *
 * apim 只读取字段声明来生成客户端类型，不会执行运行时校验。
 */
export interface ApiModuleMeta {
  query: {
    name?: string
  }
  res: {
    message: string
    source: string
  }
}

export default defineEventHandler(event => {
  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : 'apim'

  return {
    message: `Hello, ${name}!`,
    source: 'packages/nuxt/playground/modules/demo-api/runtime/server/profile.get.ts',
  } satisfies ApiModuleMeta['res']
})
