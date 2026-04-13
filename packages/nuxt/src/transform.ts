import type { SFCScriptBlock } from '@vue/compiler-sfc'
import type { Plugin } from 'vite'
import { parse as parseVueSfc } from '@vue/compiler-sfc'
import { parse as parseScriptAst } from 'oxc-parser'

interface BindingScope {
  parent?: BindingScope
  bindings: Set<string>
}

interface Replacement {
  start: number
  end: number
  value: string
}

interface AstNode {
  type?: string
  start?: number
  end?: number
  [key: string]: any
}

const CALLA_CALL_NAME = 'calla'
const USE_FETCH_NAME = 'useFetch'
const SCRIPT_LANG_SUFFIX: Record<string, string> = {
  js: 'js',
  jsx: 'jsx',
  ts: 'ts',
  tsx: 'tsx',
}
const SCRIPT_FILE_RE = /\.[cm]?[jt]sx?$/

function stripQuery(id: string) {
  return id.replace(/\?.*$/, '')
}

function isSupportedScriptFile(id: string) {
  return SCRIPT_FILE_RE.test(id)
}

function shouldTransform(id: string, code: string) {
  if (!code.includes(`${CALLA_CALL_NAME}(`)) return false
  if (id.startsWith('\0')) return false
  if (
    id.includes('/node_modules/')
    || id.includes('/.nuxt/')
    || id.includes('/.output/')
  )
    return false
  return true
}

function addBinding(bindings: Set<string>, name?: string) {
  if (name) bindings.add(name)
}

function isScriptBlock(block: SFCScriptBlock | null): block is SFCScriptBlock {
  return block !== null
}

function collectPatternBindings(
  node: AstNode | null | undefined,
  bindings: Set<string>,
) {
  if (!node) return

  switch (node.type) {
    case 'Identifier':
      addBinding(bindings, node.name)
      return
    case 'AssignmentPattern':
      collectPatternBindings(node.left, bindings)
      return
    case 'RestElement':
      collectPatternBindings(node.argument, bindings)
      return
    case 'ArrayPattern':
      node.elements?.forEach((element: AstNode | null) =>
        collectPatternBindings(element, bindings),
      )
      return
    case 'ObjectPattern':
      node.properties?.forEach((property: AstNode) => {
        if (property.type === 'Property') {
          collectPatternBindings(property.value, bindings)
          return
        }
        if (property.type === 'RestElement')
          collectPatternBindings(property.argument, bindings)
      })
  }
}

function collectBindingsFromDeclaration(
  node: AstNode | null | undefined,
  bindings: Set<string>,
) {
  if (!node) return

  switch (node.type) {
    case 'ImportDeclaration':
      node.specifiers?.forEach((specifier: AstNode) => {
        collectPatternBindings(specifier.local, bindings)
      })
      return
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration':
      collectPatternBindings(node.id, bindings)
      return
    case 'VariableDeclaration':
      node.declarations?.forEach((declaration: AstNode) => {
        collectPatternBindings(declaration.id, bindings)
      })
      return
    case 'ExportNamedDeclaration':
      collectBindingsFromDeclaration(node.declaration, bindings)
      return
    case 'ExportDefaultDeclaration':
      collectBindingsFromDeclaration(node.declaration, bindings)
  }
}

function collectDirectBlockBindings(statements: AstNode[] = []) {
  const bindings = new Set<string>()

  statements.forEach((statement) => {
    if (statement?.type === 'VariableDeclaration' && statement.kind === 'var')
      return
    collectBindingsFromDeclaration(statement, bindings)
  })

  return bindings
}

function collectVarBindings(
  node: AstNode | null | undefined,
  bindings: Set<string>,
) {
  if (!node || typeof node !== 'object') return

  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return
    case 'VariableDeclaration':
      if (node.kind === 'var') {
        node.declarations?.forEach((declaration: AstNode) => {
          collectPatternBindings(declaration.id, bindings)
        })
      }
      break
    default:
      break
  }

  for (const value of Object.values(node)) {
    if (!value) continue
    if (Array.isArray(value)) {
      value.forEach((child) => {
        if (child && typeof child === 'object')
          collectVarBindings(child, bindings)
      })
      continue
    }
    if (typeof value === 'object') collectVarBindings(value, bindings)
  }
}

function createScope(
  parent?: BindingScope,
  initialBindings?: Iterable<string>,
): BindingScope {
  return {
    parent,
    bindings: new Set(initialBindings),
  }
}

function scopeHasBinding(
  scope: BindingScope | undefined,
  name: string,
): boolean {
  let current = scope
  while (current) {
    if (current.bindings.has(name)) return true
    current = current.parent
  }
  return false
}

function getLoopBindings(node: AstNode) {
  const bindings = new Set<string>()
  const target = node.type === 'ForStatement' ? node.init : node.left

  if (target?.type === 'VariableDeclaration' && target.kind !== 'var') {
    target.declarations?.forEach((declaration: AstNode) => {
      collectPatternBindings(declaration.id, bindings)
    })
  }

  return bindings
}

function getSwitchBindings(node: AstNode) {
  const bindings = new Set<string>()
  node.cases?.forEach((caseNode: AstNode) => {
    caseNode.consequent?.forEach((statement: AstNode) => {
      if (statement?.type === 'VariableDeclaration' && statement.kind === 'var')
        return
      collectBindingsFromDeclaration(statement, bindings)
    })
  })
  return bindings
}

function walkAst(
  node: AstNode | null | undefined,
  scope: BindingScope,
  replacements: Replacement[],
) {
  if (!node || typeof node !== 'object') return

  switch (node.type) {
    case 'Program': {
      const programBindings = new Set<string>()
      node.body?.forEach((statement: AstNode) =>
        collectBindingsFromDeclaration(statement, programBindings),
      )
      node.body?.forEach((statement: AstNode) =>
        collectVarBindings(statement, programBindings),
      )
      const programScope = createScope(scope, programBindings)
      node.body?.forEach((statement: AstNode) =>
        walkAst(statement, programScope, replacements),
      )
      return
    }

    case 'BlockStatement': {
      const blockScope = createScope(
        scope,
        collectDirectBlockBindings(node.body),
      )
      node.body?.forEach((statement: AstNode) =>
        walkAst(statement, blockScope, replacements),
      )
      return
    }

    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      const functionBindings = new Set<string>()
      collectPatternBindings(node.id, functionBindings)
      node.params?.forEach((param: AstNode) =>
        collectPatternBindings(param, functionBindings),
      )
      collectVarBindings(node.body, functionBindings)
      const functionScope = createScope(scope, functionBindings)

      node.params?.forEach((param: AstNode) =>
        walkAst(param, functionScope, replacements),
      )
      walkAst(node.body, functionScope, replacements)
      return
    }

    case 'CatchClause': {
      const catchBindings = new Set<string>()
      collectPatternBindings(node.param, catchBindings)
      const catchScope = createScope(scope, catchBindings)
      walkAst(node.body, catchScope, replacements)
      return
    }

    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement': {
      const loopBindings = getLoopBindings(node)
      const loopScope = loopBindings.size
        ? createScope(scope, loopBindings)
        : scope

      for (const [key, value] of Object.entries(node)) {
        if (key === 'type' || key === 'start' || key === 'end') continue
        if (!value) continue
        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (child && typeof child === 'object')
              walkAst(child, loopScope, replacements)
          })
          continue
        }
        if (typeof value === 'object') walkAst(value, loopScope, replacements)
      }
      return
    }

    case 'SwitchStatement': {
      const switchBindings = getSwitchBindings(node)
      const switchScope = switchBindings.size
        ? createScope(scope, switchBindings)
        : scope
      walkAst(node.discriminant, switchScope, replacements)
      node.cases?.forEach((caseNode: AstNode) =>
        walkAst(caseNode, switchScope, replacements),
      )
      return
    }

    case 'CallExpression': {
      if (
        node.callee?.type === 'Identifier'
        && node.callee.name === CALLA_CALL_NAME
        && !scopeHasBinding(scope, CALLA_CALL_NAME)
        && typeof node.callee.start === 'number'
        && typeof node.callee.end === 'number'
      ) {
        replacements.push({
          start: node.callee.start,
          end: node.callee.end,
          value: USE_FETCH_NAME,
        })
      }
      break
    }

    default:
      break
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue
    if (!value) continue
    if (Array.isArray(value)) {
      value.forEach((child) => {
        if (child && typeof child === 'object')
          walkAst(child, scope, replacements)
      })
      continue
    }
    if (typeof value === 'object') walkAst(value, scope, replacements)
  }
}

function applyReplacements(code: string, replacements: Replacement[]) {
  if (!replacements.length) return null

  const sorted = [...replacements].sort((a, b) => b.start - a.start)
  let result = code

  sorted.forEach((replacement) => {
    result = `${result.slice(0, replacement.start)}${replacement.value}${result.slice(replacement.end)}`
  })

  return result === code ? null : result
}

async function transformScript(code: string, id: string, offset = 0) {
  const ast = await parseScriptAst(id, code, {
    sourceType: 'module',
  })

  const replacements: Replacement[] = []
  walkAst(ast.program as AstNode, createScope(), replacements)

  if (!replacements.length) return null

  return replacements.map(replacement => ({
    ...replacement,
    start: replacement.start + offset,
    end: replacement.end + offset,
  }))
}

function getVueScriptId(id: string, lang?: string) {
  const suffix = SCRIPT_LANG_SUFFIX[lang ?? ''] ?? 'js'
  return `${id}.${suffix}`
}

export function createCallaToUseFetchPlugin(): Plugin {
  return {
    name: 'sdkr:calla-to-use-fetch',
    enforce: 'pre',
    async transform(code, id) {
      const cleanId = stripQuery(id)
      if (!shouldTransform(cleanId, code)) return null

      try {
        if (cleanId.endsWith('.vue')) {
          const { descriptor } = parseVueSfc(code, { filename: cleanId })
          const replacements: Replacement[] = []

          const scriptBlocks = [
            descriptor.script,
            descriptor.scriptSetup,
          ].filter(isScriptBlock)
          for (const block of scriptBlocks) {
            const transformed = await transformScript(
              block.content,
              getVueScriptId(cleanId, block.lang),
              block.loc.start.offset,
            )
            if (transformed) replacements.push(...transformed)
          }

          const nextCode = applyReplacements(code, replacements)
          if (!nextCode) return null

          return {
            code: nextCode,
            map: null,
          }
        }

        if (!isSupportedScriptFile(cleanId)) return null

        const replacements = await transformScript(code, cleanId)
        const nextCode = applyReplacements(code, replacements ?? [])
        if (!nextCode) return null

        return {
          code: nextCode,
          map: null,
        }
      }
      catch (error) {
        this.warn(
          `[sdkr] Failed to rewrite calla() in ${cleanId}: ${error instanceof Error ? error.message : String(error)}`,
        )
        return null
      }
    },
  }
}
