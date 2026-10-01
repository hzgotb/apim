import { scaffoldCollection } from './collection.mjs'

function printUsage() {
  console.log(`Usage:
  apim collection <targetPath> [--template minimal|example]

Commands:
  collection   Generate an API collection scaffold in a project-relative directory

Options:
  --example    Shortcut for "--template example"
  --help       Show this help message

Notes:
  - <targetPath> must be relative to the Nuxt app root.
  - The collection name defaults to the last path segment.
  - The default clientPrefix is "/<name>".`)
}

function parseCollectionArgs(argv) {
  let targetPath = ''
  let template = 'minimal'

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help') {
      return { help: true }
    }

    if (arg === '--example') {
      template = 'example'
      continue
    }

    if (arg === '--template') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('[apim] Missing value for "--template".')
      }
      template = value
      index += 1
      continue
    }

    if (arg.startsWith('--template=')) {
      template = arg.slice('--template='.length)
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`[apim] Unknown option "${arg}".`)
    }

    if (targetPath) {
      throw new Error('[apim] Only one target path is supported.')
    }

    targetPath = arg
  }

  if (template !== 'minimal' && template !== 'example') {
    throw new Error('[apim] "--template" must be "minimal" or "example".')
  }

  return {
    help: false,
    targetPath,
    template,
  }
}

async function main() {
  const [, , command, ...rest] = process.argv

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    return
  }

  if (command !== 'collection') {
    throw new Error(`[apim] Unknown command "${command}".`)
  }

  const args = parseCollectionArgs(rest)
  if (args.help) {
    printUsage()
    return
  }

  if (!args.targetPath) {
    throw new Error(
      '[apim] Missing target path. Example: "apim collection modules/demo-api".',
    )
  }

  const result = await scaffoldCollection({
    targetPath: args.targetPath,
    template: args.template,
  })

  console.log(
    `[apim] Using collection name "${result.name}" derived from the last segment of "${result.targetPath}".`,
  )
  console.log(`[apim] Using clientPrefix "${result.clientPrefix}".`)
  console.log(`[apim] Template: ${result.template}.`)
  console.log('[apim] Created files:')
  result.createdFiles.forEach((file) => {
    console.log(`  ${file}`)
  })
  console.log(
    `[apim] Add "${result.targetPath}" to "apim.collections" in your nuxt.config when you want this collection to be loaded.`,
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
