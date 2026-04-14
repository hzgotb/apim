import { posix } from 'node:path'

interface IgnoreResolutionContext {
  collectionName?: string
  routeGroupLabel?: string
}

function formatContext(context?: IgnoreResolutionContext) {
  const details = []

  if (context?.collectionName) {
    details.push(`collection "${context.collectionName}"`)
  }

  if (context?.routeGroupLabel) {
    details.push(`route group ${context.routeGroupLabel}`)
  }

  if (details.length === 0) return ''
  return ` for ${details.join(', ')}`
}

function assertValidIgnorePatterns(
  ignore: string[],
  scope: 'collection' | 'routeGroup',
  context?: IgnoreResolutionContext,
) {
  ignore.forEach((pattern, index) => {
    if (pattern !== '!...') return

    if (scope === 'routeGroup' && index === 0) return

    const label = scope === 'collection'
      ? 'collection ignore'
      : 'routeGroup ignore'
    const position = scope === 'collection'
      ? ''
      : ' outside the first position'

    throw new Error(
      `[calla] Invalid ${label}${position}${formatContext(context)}: `
      + `'!...' is only allowed as the first routeGroup ignore item.`,
    )
  })
}

export function resolveRouteGroupIgnore(
  collectionIgnore?: string[],
  routeGroupIgnore?: string[],
  context?: IgnoreResolutionContext,
): string[] {
  const normalizedCollectionIgnore = collectionIgnore ?? []
  assertValidIgnorePatterns(normalizedCollectionIgnore, 'collection', context)

  if (!routeGroupIgnore || routeGroupIgnore.length === 0) {
    return [...normalizedCollectionIgnore]
  }

  assertValidIgnorePatterns(routeGroupIgnore, 'routeGroup', context)

  if (routeGroupIgnore[0] === '!...') {
    return routeGroupIgnore.slice(1)
  }

  return [...normalizedCollectionIgnore, ...routeGroupIgnore]
}

export function isIgnoredPath(path: string, ignore?: string[]): boolean {
  let ignored = false

  ignore?.forEach((pattern) => {
    const isNegated = pattern.startsWith('!')
    const candidate = isNegated ? pattern.slice(1) : pattern

    if (!candidate) return
    if (!posix.matchesGlob(path, candidate)) return

    ignored = !isNegated
  })

  return ignored
}
