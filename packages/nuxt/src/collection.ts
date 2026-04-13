export interface ApiRouteGroup {
  dir: string | RegExp
  clientPrefix: string
  ignore?: string[]
}

export interface CallaCollection {
  name: string
  root?: string
  routeGroups: ApiRouteGroup[]
  ignore?: string[]
}

export const CALLA_COLLECTION_KEY = '@heyintech/sdkr/calla-collection'

export interface CallaCollectionEntry<T extends CallaCollection = CallaCollection> {
  key: typeof CALLA_COLLECTION_KEY
  options: T
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function defineCallaCollection<T extends CallaCollection>(
  options: T,
): CallaCollectionEntry<T> {
  return {
    key: CALLA_COLLECTION_KEY,
    options,
  }
}

export function parseCallaCollectionEntry(
  entry: unknown,
  collectionPath: string,
): CallaCollection {
  if (
    !isObjectRecord(entry)
    || entry.key !== CALLA_COLLECTION_KEY
    || !isObjectRecord(entry.options)
  ) {
    throw new Error(
      `[sdkr] Collection "${collectionPath}" must export a default defineCallaCollection({...}) entry.`,
    )
  }

  return entry.options as unknown as CallaCollection
}
