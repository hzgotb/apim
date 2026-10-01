import type { ScannedServerRoute } from './scan'

export interface ComparableHandler {
  source: 'host' | 'collection'
  ownerLabel: string
  handler: string
  route: string
  method?: string
}

export interface CollectionHandler extends ScannedServerRoute {
  collectionName: string
}

export interface HostHandler {
  handler: string
  route?: string
  method?: string
}

function normalizeMethod(method?: string) {
  return method?.toLowerCase()
}

export function toRouteSignature(
  handler: Pick<ComparableHandler, 'route' | 'method'>,
): string {
  return `${normalizeMethod(handler.method)?.toUpperCase() ?? '*'} ${handler.route}`
}

export function toComparableCollectionHandler(
  handler: CollectionHandler,
): ComparableHandler {
  return {
    source: 'collection',
    ownerLabel: handler.collectionName,
    handler: handler.handler,
    route: handler.route,
    method: normalizeMethod(handler.method),
  }
}

export function toComparableHostHandler(
  handler: HostHandler,
): ComparableHandler {
  const ownerLabel = handler.handler.includes('/server/api/')
    ? 'host server/api'
    : handler.handler.includes('/server/routes/')
      ? 'host server/routes'
      : 'host serverHandlers'

  return {
    source: 'host',
    ownerLabel,
    handler: handler.handler,
    route: handler.route ?? '',
    method: normalizeMethod(handler.method),
  }
}

export function filterExcludedCollectionHandlers(
  handlers: CollectionHandler[],
  exclude: string[] = [],
): CollectionHandler[] {
  const excluded = new Set(exclude)
  return handlers.filter(handler => !excluded.has(toRouteSignature(handler)))
}

function routesConflict(a: ComparableHandler, b: ComparableHandler) {
  if (a.route !== b.route) return false
  if (!a.method || !b.method) return true
  return a.method === b.method
}

export function assertNoComparableRouteConflicts(
  handlers: ComparableHandler[],
  opts?: { crossSourceOnly?: boolean },
): void {
  const visited: ComparableHandler[] = []

  handlers.forEach((handler) => {
    const conflict = visited.find((existing) => {
      if (opts?.crossSourceOnly && existing.source === handler.source) {
        return false
      }

      return routesConflict(existing, handler)
    })
    if (!conflict) {
      visited.push(handler)
      return
    }

    const methodLabel = !conflict.method || !handler.method
      ? '*'
      : normalizeMethod(handler.method)?.toUpperCase() ?? '*'

    throw new Error(
      `[apim] Route conflict on ${methodLabel} ${handler.route}: `
      + `${conflict.ownerLabel} (${conflict.handler}) conflicts with `
      + `${handler.ownerLabel} (${handler.handler}).`,
    )
  })
}
