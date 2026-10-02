# @hzgotb/apim-cli

CLI for scaffolding apim API modules and handler directories.

## Install

```bash
pnpm add -D @hzgotb/apim-cli
```

## Usage

```bash
pnpm exec apim collection modules/demo-api
pnpm exec apim collection modules/demo-api --example
```

The target directory must be empty or not exist. Add the generated directory to
the `apim.collections` option in your Nuxt configuration.

See the [CLI documentation](https://hzgotb.github.io/apim/packages/cli) for more
details.
