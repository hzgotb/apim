import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'
import { withBase, withLeadingSlash, withoutTrailingSlash } from 'ufo'
import { isIgnoredPath } from './ignore'

export const GLOB_SCAN_PATTERN = '**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}'

interface FileInfo {
  path: string
  fullPath: string
}

const suffixRegex
  = /(\.(?<method>connect|delete|get|head|options|patch|post|put|trace))?(\.(?<env>dev|prod|prerender))?$/

// prettier-ignore
type MatchedMethodSuffix = 'connect' | 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'
type MatchedEnvSuffix = 'dev' | 'prod' | 'prerender'

export interface ScannedServerRoute {
  handler: string
  lazy: true
  middleware: false
  route: string
  method?: MatchedMethodSuffix
  env?: MatchedEnvSuffix
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

function normalizeRegex(regex: RegExp) {
  return new RegExp(regex.source, regex.flags.replaceAll('g', ''))
}

function sanitizeRouteParam(name: string) {
  return name.replace(/[^\w-]/g, '_')
}

async function scanDir(
  rootDir: string,
  dir: string,
  opts?: { ignore?: string[], logger?: { warn(message: string): void } },
): Promise<FileInfo[]> {
  const baseDir = join(rootDir, dir)
  const fileNames = await glob(GLOB_SCAN_PATTERN, {
    cwd: baseDir,
    dot: true,
    absolute: true,
  }).catch((error) => {
    if (error?.code === 'ENOTDIR') {
      opts?.logger?.warn(`Ignoring \`${baseDir}\`. It must be a directory.`)
      return []
    }
    throw error
  })

  return fileNames
    .map(fullPath => ({
      fullPath,
      path: normalizePath(relative(baseDir, fullPath)),
    }))
    .filter(file => !isIgnoredPath(file.path, opts?.ignore))
    .sort((a, b) => a.path.localeCompare(b.path))
}

async function scanRegex(
  rootDir: string,
  dir: RegExp,
  opts?: { ignore?: string[] },
): Promise<FileInfo[]> {
  const matcher = normalizeRegex(dir)
  const fileNames = await glob(GLOB_SCAN_PATTERN, {
    cwd: rootDir,
    dot: true,
    absolute: true,
  })

  return fileNames
    .map((fullPath) => {
      const relativePath = normalizePath(relative(rootDir, fullPath))
      if (isIgnoredPath(relativePath, opts?.ignore)) return null

      const match = matcher.exec(relativePath)
      if (!match || match.index !== 0) return null

      const strippedPath = relativePath
        .slice(match[0].length)
        .replace(/^\/+/, '')
      if (!strippedPath) return null

      return {
        fullPath,
        path: strippedPath,
      }
    })
    .filter((file): file is FileInfo => Boolean(file))
    .sort((a, b) => a.path.localeCompare(b.path))
}

async function scanFiles(
  rootDir: string,
  dir: string | RegExp,
  opts?: { ignore?: string[], logger?: { warn(message: string): void } },
) {
  if (typeof dir === 'string') return scanDir(rootDir, dir, opts)

  return scanRegex(rootDir, dir, opts)
}

export async function scanServerRoutes(
  rootDir: string,
  dir: string | RegExp,
  prefix = '/',
  opts?: { ignore?: string[], logger?: { warn(message: string): void } },
): Promise<ScannedServerRoute[]> {
  const files = await scanFiles(rootDir, dir, opts)

  return files.map((file) => {
    let route = file.path
      .replace(/\.[A-Z]+$/i, '')
      .replace(/\(([^(/\\]+)\)[/\\]/g, '')
      .replace(/\[\.{3}\]/g, '**')
      .replace(/\[\.{3}([^\]]+)\]/g, (_, name: string) => `**:${sanitizeRouteParam(name)}`)
      .replace(/\[([^/\]]+)\]/g, (_, name: string) => `:${sanitizeRouteParam(name)}`)

    route = withLeadingSlash(withoutTrailingSlash(withBase(route, prefix)))

    const suffixMatch = route.match(suffixRegex)
    let method: MatchedMethodSuffix | undefined
    let env: MatchedEnvSuffix | undefined
    if (suffixMatch?.index && suffixMatch.index >= 0) {
      route = route.slice(0, suffixMatch.index)
      method = suffixMatch.groups?.method as MatchedMethodSuffix | undefined
      env = suffixMatch.groups?.env as MatchedEnvSuffix | undefined
    }

    route = route.replace(/\/index$/, '') || '/'

    return {
      handler: file.fullPath,
      lazy: true,
      middleware: false,
      route,
      method,
      env,
    }
  })
}
