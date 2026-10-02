import { describe, expect, it } from 'vite-plus/test'
import { APIM_COLLECTION_KEY, defineApiModule, parseApiModuleEntry } from '../src/collection/index'

describe('defineApiModule entry', () => {
  it('wraps collection options in a keyed runtime entry', () => {
    const options = {
      name: 'demo',
      handlers: [
        {
          dir: 'runtime/server',
          clientPrefix: '/demo',
        },
      ],
    }

    expect(defineApiModule(options)).toEqual({
      key: APIM_COLLECTION_KEY,
      options,
    })
  })

  it('unwraps a keyed runtime entry into collection options', () => {
    const options = {
      name: 'demo',
      handlers: [
        {
          dir: 'runtime/server',
          clientPrefix: '/demo',
        },
      ],
    }

    expect(parseApiModuleEntry(defineApiModule(options), '/virtual/demo.collection.ts')).toEqual(
      options,
    )
  })

  it('rejects plain object exports that are not keyed collection entries', () => {
    expect(() =>
      parseApiModuleEntry(
        {
          name: 'demo',
          handlers: [],
        },
        '/virtual/demo.collection.ts',
      ),
    ).toThrow(/defineApiModule/)
  })
})
