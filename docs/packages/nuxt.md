# @hzgotb/apim-nuxt

Nuxt 4 模块包，负责 collection 加载、handler 扫描、Nitro 注册、类型模板生成和 `apim()` 编译转换。

## 导出

```ts
import {
  defineApiModule,
  type ApiCollection,
  type ApiHandlers,
} from '@hzgotb/apim-nuxt'
```

请求端的 `apim` 通过全局注入或 `#apim/apim` 虚拟模块提供。

## 入口

| 入口 | 内容 |
| --- | --- |
| `@hzgotb/apim-nuxt` | Nuxt module 和 collection API |
| `@hzgotb/apim-nuxt/apim` | `apim()` 请求函数和请求类型 |

## Nuxt 配置

```ts
interface ModuleOptions {
  collections: string[]
  injectApimToGlobal: boolean
  exclude: string[]
}
```

详见[配置参考](/reference/configuration)。
