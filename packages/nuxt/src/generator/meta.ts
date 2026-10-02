import { readFile } from 'node:fs/promises'
import { parse } from 'oxc-parser'

/**
 * handler 可选导出的 `ApiModuleMeta` 是服务端实现与客户端调用之间的静态类型契约。
 *
 * - `body`：请求体类型。
 * - `query`：查询参数类型。
 * - `res`：成功响应类型。
 *
 * apim 只读取字段声明来生成客户端类型，不会参与运行时校验。
 */
type MetaField = 'body' | 'query' | 'res'

const metaName = 'ApiModuleMeta'

// 只接受 ApiModuleMeta 里约定的三个字段，其他字段即使存在也不会参与类型生成。
const metaFields = new Set<MetaField>(['body', 'query', 'res'])

// 缓存“文件路径 -> 解析结果”的 Promise，避免同一个 handler 在一次生成周期里被重复读盘和重复 parse。
const metaFieldCache = new Map<string, Promise<MetaField[]>>()

/**
 * 作用：从 interface/type literal 的成员列表里提取可用的 ApiModuleMeta 字段名。
 */
function getMetaFieldsFromMembers(members: unknown[]): MetaField[] {
  return members
    .map((member: any) => {
      // 这里只关心类型字面量/interface 中的属性签名，例如：
      // export interface ApiModuleMeta { body: Foo; res: Bar }
      if (member?.type !== 'TSPropertySignature') return ''
      if (member.key?.type === 'Identifier') return member.key.name as string
      if (typeof member.key?.value === 'string')
        return member.key.value as string
      return ''
    })
    .filter((name): name is MetaField =>
      metaFields.has(name as MetaField),
    )
}

/**
 * 作用：从单个导出声明节点中识别 `ApiModuleMeta`，并提取其中声明的字段。
 */
function getMetaFields(node: any): MetaField[] {
  const declaration = node?.declaration

  // 只识别名字严格等于 ApiModuleMeta 的导出声明，其他导出类型一律忽略。
  if (declaration?.id?.name !== metaName) {
    return []
  }

  // 支持 interface 写法：
  // export interface ApiModuleMeta { query: Query; res: Res }
  if (declaration.type === 'TSInterfaceDeclaration') {
    return getMetaFieldsFromMembers(declaration.body?.body ?? [])
  }

  // 也支持 type literal 写法：
  // export type ApiModuleMeta = { body: Body; res: Res }
  if (
    declaration.type === 'TSTypeAliasDeclaration'
    && declaration.typeAnnotation?.type === 'TSTypeLiteral'
  ) {
    return getMetaFieldsFromMembers(declaration.typeAnnotation.members ?? [])
  }

  return []
}

/**
 * 作用：清空 ApiModuleMeta 解析缓存，保证下一轮模板生成读取到最新源码。
 */
export function clearMetaFieldCache(): void {
  // 每轮重新生成模板前清空，避免开发时增删字段后命中旧缓存。
  metaFieldCache.clear()
}

/**
 * 作用：读取并解析一个 handler 文件，返回它导出的 `ApiModuleMeta` 字段列表。
 */
export async function getExportedMetaFields(
  filePath: string,
): Promise<MetaField[]> {
  // 命中缓存时直接复用正在进行或已经完成的解析任务。
  if (metaFieldCache.has(filePath)) {
    if (import.meta.dev) {
      console.log(`[apim] Cached ApiModuleMeta for ${filePath}`)
    }
    return metaFieldCache.get(filePath) ?? []
  }

  const task = (async () => {
    try {
      const content = await readFile(filePath, { encoding: 'utf-8' })
      const ast = await parse(filePath, content, {
        sourceType: 'module',
      })

      const fields = new Set<MetaField>()

      // 只扫描顶层的具名导出声明：
      // export interface ApiModuleMeta ...
      // export type ApiModuleMeta = ...
      ast.program.body
        .filter((node: any) => node.type === 'ExportNamedDeclaration')
        .forEach((node: any) => {
          // 用 Set 去重，避免出现重复字段定义时生成重复结果。
          getMetaFields(node).forEach(field => fields.add(field))
        })

      return Array.from(fields)
    }
    catch (error) {
      // 解析失败时返回空数组，让上层把这个 handler 当成“没有可提取的 ApiModuleMeta”处理。
      console.warn(`[apim] Failed to parse file: ${filePath}`, error)
      return []
    }
  })()

  // 先把 Promise 放进缓存，确保并发请求同一个文件时只会真正解析一次。
  metaFieldCache.set(filePath, task)
  return task
}
