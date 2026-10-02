import { defineEventHandler, readBody } from 'h3'

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
  body: {
    message: string
    repeat?: number
  }
  res: {
    echoed: string[]
    total: number
  }
}

export default defineEventHandler(async event => {
  const body = await readBody<ApiModuleMeta['body']>(event)
  const repeat = Math.max(1, Math.min(3, body?.repeat ?? 1))
  const message = body?.message ?? ''

  return {
    echoed: Array.from({ length: repeat }, () => message),
    total: repeat,
  } satisfies ApiModuleMeta['res']
})
