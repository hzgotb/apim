# 配置参考

## Nuxt 模块配置

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/*'],
    injectApimToGlobal: true,
    exclude: ['GET /api/health'],
  },
})
```

### `collections`

`string[]`，默认为 `[]`。支持三种形式：

- `modules/demo-api`：目录，补全为 `collection.ts`；
- `modules/demo-api/collection.ts`：显式入口；
- `modules/*`：glob，匹配每个 collection 入口。

### `injectApimToGlobal`

默认为 `true`。开启后在 Nuxt 类型环境中注入全局 `apim`；关闭后使用：

```ts
import { apim } from '#apim/apim'
```

### `exclude`

按最终路由签名过滤 collection handler，例如 `GET /api/profile`。被过滤的 handler 不会注册到 Nitro，也不会进入 `InternalApiPayload`。

## 目录布局

```text
modules/demo-api/
├─ collection.ts
└─ runtime/
   ├─ server/
   │  ├─ profile.get.ts
   │  └─ users/[id].get.ts
   └─ stores/
```

`runtime/stores` 存在时会加入 Nuxt imports 目录。
