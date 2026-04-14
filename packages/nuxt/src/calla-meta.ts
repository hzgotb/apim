import { readFile } from 'node:fs/promises'
import { parse } from 'oxc-parser'

export type CallaMetaField = 'body' | 'query' | 'res'

export const CALLA_META_NAME = 'CallaMeta'

// 只接受 CallaMeta 里约定的三个字段，其他字段即使存在也不会参与类型生成。
const CALLA_META_FIELDS = new Set<CallaMetaField>(['body', 'query', 'res'])

// 缓存“文件路径 -> 解析结果”的 Promise，避免同一个 handler 在一次生成周期里被重复读盘和重复 parse。
const callaMetaFieldCache = new Map<string, Promise<CallaMetaField[]>>()

/**
 * 作用：从 interface/type literal 的成员列表里提取可用的 CallaMeta 字段名。
 */
function getMetaFieldsFromMembers(members: unknown[]): CallaMetaField[] {
  return members
    .map((member: any) => {
      // 这里只关心类型字面量/interface 中的属性签名，例如：
      // export interface CallaMeta { body: Foo; res: Bar }
      if (member?.type !== 'TSPropertySignature') return ''
      if (member.key?.type === 'Identifier') return member.key.name as string
      if (typeof member.key?.value === 'string')
        return member.key.value as string
      return ''
    })
    .filter((name): name is CallaMetaField =>
      CALLA_META_FIELDS.has(name as CallaMetaField),
    )
}

/**
 * 作用：从单个导出声明节点中识别 `CallaMeta`，并提取其中声明的字段。
 */
function getCallaMetaFields(node: any): CallaMetaField[] {
  const declaration = node?.declaration

  // 只识别名字严格等于 CallaMeta 的导出声明，其他导出类型一律忽略。
  if (declaration?.id?.name !== CALLA_META_NAME) {
    return []
  }

  // 支持 interface 写法：
  // export interface CallaMeta { query: Query; res: Res }
  if (declaration.type === 'TSInterfaceDeclaration') {
    return getMetaFieldsFromMembers(declaration.body?.body ?? [])
  }

  // 也支持 type literal 写法：
  // export type CallaMeta = { body: Body; res: Res }
  if (
    declaration.type === 'TSTypeAliasDeclaration'
    && declaration.typeAnnotation?.type === 'TSTypeLiteral'
  ) {
    return getMetaFieldsFromMembers(declaration.typeAnnotation.members ?? [])
  }

  return []
}

/**
 * 作用：清空 CallaMeta 解析缓存，保证下一轮模板生成读取到最新源码。
 */
export function clearCallaMetaFieldCache(): void {
  // 每轮重新生成模板前清空，避免开发时增删字段后命中旧缓存。
  callaMetaFieldCache.clear()
}

/**
 * 作用：读取并解析一个 handler 文件，返回它导出的 `CallaMeta` 字段列表。
 */
export async function getExportedCallaMetaFields(
  filePath: string,
): Promise<CallaMetaField[]> {
  // 命中缓存时直接复用正在进行或已经完成的解析任务。
  if (callaMetaFieldCache.has(filePath)) {
    if (import.meta.dev) {
      console.log(`[calla] Cached CallaMeta for ${filePath}`)
    }
    return callaMetaFieldCache.get(filePath) ?? []
  }

  const task = (async () => {
    try {
      const content = await readFile(filePath, { encoding: 'utf-8' })
      const ast = await parse(filePath, content, {
        sourceType: 'module',
      })

      const metaFields = new Set<CallaMetaField>()

      // 只扫描顶层的具名导出声明：
      // export interface CallaMeta ...
      // export type CallaMeta = ...
      ast.program.body
        .filter((node: any) => node.type === 'ExportNamedDeclaration')
        .forEach((node: any) => {
          // 用 Set 去重，避免出现重复字段定义时生成重复结果。
          getCallaMetaFields(node).forEach(field => metaFields.add(field))
        })

      return Array.from(metaFields)
    }
    catch (error) {
      // 解析失败时返回空数组，让上层把这个 handler 当成“没有可提取的 CallaMeta”处理。
      console.warn(`[calla] Failed to parse file: ${filePath}`, error)
      return []
    }
  })()

  // 先把 Promise 放进缓存，确保并发请求同一个文件时只会真正解析一次。
  callaMetaFieldCache.set(filePath, task)
  return task
}
