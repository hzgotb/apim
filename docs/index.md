---
layout: home

hero:
  name: apim
  text: Typed API collections for Nuxt
  tagline: 把文件式 Nitro handlers 变成可推导类型的客户端 API
  image:
    src: /apim-mark.svg
    alt: apim
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/getting-started
    - theme: alt
      text: 查看 ApiModuleMeta
      link: /reference/api-module-meta

features:
  - icon: 🧩
    title: Collection 驱动
    details: 用 defineApiModule 描述路由目录、客户端前缀和忽略规则。
  - icon: 🧠
    title: ApiModuleMeta 推导
    details: 从 handler 导出的 body、query、res 模型生成 apim() 的请求和响应类型。
  - icon: 🛡️
    title: 冲突可见
    details: 在 Nuxt/Nitro 配置阶段检测 collection 与宿主路由的冲突。
  - icon: ⚡
    title: 编译期转换
    details: apim() 会被转换为 useFetch()，运行时不引入额外请求层。
---

## 选择你的入口

::: code-group

```bash [pnpm]
pnpm add @hzgotb/apim-nuxt
```

```bash [npm]
npm install @hzgotb/apim-nuxt
```

:::

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
  },
})
```

从[快速开始](/guide/getting-started)开始，或者直接阅读 [ApiModuleMeta 模型](/reference/api-module-meta)了解类型是如何生成的。
