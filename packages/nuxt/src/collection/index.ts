export interface ApiRouteGroup {
  dir: string | RegExp
  clientPrefix: string
  ignore?: string[]
}

export interface ApimCollection {
  name: string
  root?: string
  routeGroups: ApiRouteGroup[]
  ignore?: string[]
}

export const APIM_COLLECTION_KEY = '@hzgotb/apim-collection'

export interface ApiModuleEntry<T extends ApimCollection = ApimCollection> {
  key: typeof APIM_COLLECTION_KEY
  options: T
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function defineApiModule<T extends ApimCollection>(
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
): ApimCollection {
  if (
    !isObjectRecord(entry)
    || entry.key !== APIM_COLLECTION_KEY
    || !isObjectRecord(entry.options)
  ) {
    throw new Error(
      `[apim] Collection "${collectionPath}" must export a default defineApiModule({...}) entry.`,
    )
  }

  return entry.options as unknown as ApimCollection
}
