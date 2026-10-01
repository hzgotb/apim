# 构建与发布

## 构建包

```bash
pnpm build
```

构建会生成：

- `packages/cli/dist/apim.mjs`：CLI bundle；
- `packages/nuxt/dist/module.mjs`：Nuxt module；
- `packages/nuxt/dist/apim.mjs`：请求类型入口；
- `packages/nuxt/dist/*.d.ts`：Nuxt 模块和内部类型声明。

## 文档站点

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

VitePress 输出目录为 `docs/.vitepress/dist`，已加入 `.gitignore`。

## 发布包

发布工作流会先构建和测试，再通过 workspace filter 发布两个包：

```bash
pnpm --filter '@hzgotb/apim-cli' publish --access public --no-git-checks
pnpm --filter '@hzgotb/apim-nuxt' publish --access public --no-git-checks
```
