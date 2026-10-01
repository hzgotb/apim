# 快速开始

## 安装

```bash
pnpm add @hzgotb/apim-nuxt
```

`@hzgotb/apim-nuxt` 需要 Nuxt 4。CLI 是 Nuxt 包的依赖，也可以单独安装：

```bash
pnpm add -D @hzgotb/apim-cli
```

## 配置模块

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
    injectApimToGlobal: true,
  },
})
```

目录引用会自动解析为 `modules/demo-api/collection.ts`。也可以写显式文件或 glob，详见 [配置](/reference/configuration)。

## 创建 collection

```ts
// modules/demo-api/collection.ts
import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'demo-api',
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
```

`dir` 相对于 collection 的 root 目录，`clientPrefix` 是最终客户端路由前缀。

## 创建 handler

```ts
// modules/demo-api/runtime/server/profile.get.ts
import { getQuery, type H3Event } from 'h3'

export interface ApiModuleMeta {
  query: { name?: string }
  res: { message: string }
}

export default defineEventHandler((event: H3Event) => {
  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : 'world'

  return { message: `Hello, ${name}!` } satisfies ApiModuleMeta['res']
})
```

文件名 `profile.get.ts` 会生成 `GET /api/profile`。`ApiModuleMeta` 不负责运行时校验，它是 handler 与客户端类型之间的契约；完整规则见 [ApiModuleMeta 模型](/reference/api-module-meta)。

## 调用 API

启用 `injectApimToGlobal` 后可以直接调用：

```vue
<script setup lang="ts">
const { data, error } = await apim('/api/profile', {
  query: { name: 'Ada' },
})
</script>
```

`data` 会推导为 `{ message: string }`，`query.name` 会推导为可选字符串。底层调用会在构建时转换为 `useFetch`。

如果关闭全局注入，则从虚拟模块导入：

```ts
import { apim } from '#apim/apim'
```
