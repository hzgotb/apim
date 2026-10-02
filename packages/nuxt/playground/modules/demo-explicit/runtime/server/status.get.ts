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
    tag?: string
  }
  res: {
    message: string
    entry: string
    route: string
  }
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const tag = typeof query.tag === 'string' ? query.tag : 'explicit-ts-file'

  return {
    message: `Loaded via explicit collection file: ${tag}`,
    entry: 'packages/nuxt/playground/modules/demo-explicit/demo-module.ts',
    route: '/demo-explicit/status',
  } satisfies ApiModuleMeta['res']
})
