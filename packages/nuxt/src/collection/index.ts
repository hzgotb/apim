/**
 * 一组 API handler 的扫描与路由映射规则。
 *
 * apim 会在 collection 根目录下扫描 `dir` 匹配的 Nitro handlers，
 * 按 Nitro 文件路由约定生成路径，再统一拼接 `clientPrefix` 暴露给客户端。
 */
interface Handlers {
  /**
   * handler 所在目录或相对于 collection 根目录的路径匹配表达式。
   * 字符串用于扫描指定目录；正则表达式用于匹配并移除文件相对路径的前缀。
   */
  dir: string | RegExp

  /**
   * 该组路由在客户端使用的公共前缀，例如 `/api` 或 `/admin`。
   */
  clientPrefix: string

  /**
   * 相对于扫描目录的 glob 忽略规则。
   * 默认追加在 collection 级 `ignore` 之后；首项为 `!...` 时会替代 collection 级规则。
   */
  ignore?: string[]
}

/**
 * 一组 API handler 的扫描与路由映射规则。
 */
export type ApiHandlers = Handlers

/**
 * 一个可被 Nuxt 应用加载的 API 集合。
 *
 * collection 以独立目录组织一组 Nitro handlers，并通过一个或多个
 * {@link ApiHandlers} 将服务端目录映射为客户端可调用的路由。
 */
export interface ApiCollection {
  /**
   * collection 的可读名称，用于标识路由归属和输出冲突错误。
   */
  name: string

  /**
   * collection 的根目录。相对路径以 collection 声明文件所在目录为基准；
   * 省略时直接使用声明文件所在目录。
   */
  root?: string

  /**
   * 要扫描的 handler 分组及其客户端路由映射。
   */
  handlers: ApiHandlers[]

  /**
   * 应用于全部 handler 分组的 glob 忽略规则。
   */
  ignore?: string[]
}

export const APIM_COLLECTION_KEY = '@hzgotb/apim-collection'

export interface ApiModuleEntry<T extends ApiCollection = ApiCollection> {
  key: typeof APIM_COLLECTION_KEY
  options: T
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function defineApiModule<T extends ApiCollection>(
  options: T,
): ApiModuleEntry<T> {
  return {
    key: APIM_COLLECTION_KEY,
    options,
  }
}

export function parseApiModuleEntry(
  entry: unknown,
  collectionPath: string,
): ApiCollection {
  if (
    !isObjectRecord(entry)
    || entry.key !== APIM_COLLECTION_KEY
    || !isObjectRecord(entry.options)
  ) {
    throw new Error(
      `[apim] Collection "${collectionPath}" must export a default defineApiModule({...}) entry.`,
    )
  }

  return entry.options as unknown as ApiCollection
}
