import { describe, expect, it } from 'vitest'
import {
  CALLA_COLLECTION_KEY,
  defineCallaCollection,
  parseCallaCollectionEntry,
} from '../src/collection'

describe('defineCallaCollection entry', () => {
  it('wraps collection options in a keyed runtime entry', () => {
    const options = {
      name: 'demo',
      routeGroups: [
        {
          dir: 'runtime/server',
          clientPrefix: '/demo',
        },
      ],
    }

    expect(defineCallaCollection(options)).toEqual({
      key: CALLA_COLLECTION_KEY,
      options,
    })
  })

  it('unwraps a keyed runtime entry into collection options', () => {
    const options = {
      name: 'demo',
      routeGroups: [
        {
          dir: 'runtime/server',
          clientPrefix: '/demo',
        },
      ],
    }

    expect(
      parseCallaCollectionEntry(
        defineCallaCollection(options),
        '/virtual/demo.collection.ts',
      ),
    ).toEqual(options)
  })

  it('rejects plain object exports that are not keyed collection entries', () => {
    expect(() =>
      parseCallaCollectionEntry(
        {
          name: 'demo',
          routeGroups: [],
        },
        '/virtual/demo.collection.ts',
      ),
    ).toThrow(/defineCallaCollection/)
  })
})
