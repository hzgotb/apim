# 开始使用

apim 是一个 Nuxt 模块和 CLI：它扫描约定目录中的 Nitro handlers，把这些 handlers 注册到宿主应用，并根据每个 handler 的 `ApiModuleMeta` 生成客户端类型。

```text
collection.ts
  └─ runtime/server/profile.get.ts  ──┐
                                      ├─ Nitro route
ApiModuleMeta { query, res } ──────────────┘
                                      └─ apim('/api/profile') 类型
```

## 文档路线

1. [快速开始](/guide/getting-started)：安装模块、创建 collection、调用第一个 API。
2. [核心概念](/guide/concepts)：了解扫描、注册、类型生成和编译转换的边界。
3. [ApiModuleMeta 模型](/reference/api-module-meta)：理解请求与响应模型的字段映射。
4. [配置参考](/reference/configuration)：查阅 Nuxt 模块配置和 package 入口。
