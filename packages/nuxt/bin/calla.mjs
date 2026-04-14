#!/usr/bin/env node

import { access } from 'node:fs/promises'

async function loadCli() {
  const distEntry = new URL('../dist/calla.mjs', import.meta.url)

  try {
    await access(distEntry)
    await import(distEntry.href)
    return
  }
  catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      await import('../../cli/src/calla.mjs')
      return
    }

    throw error
  }
}

await loadCli()
