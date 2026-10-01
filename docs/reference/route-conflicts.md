# 路由冲突

apim 在注册 collection handlers 前做两类检查：

1. collection 与 collection 之间的相同 route/method 冲突；
2. collection 与宿主 `server/api`、`server/routes`、`serverHandlers` 之间的跨来源冲突。

```text
[apim] Route conflict on GET /api/profile:
host server/api (...) conflicts with demo-api (...)
```

## 解决方式

优先调整 `clientPrefix` 或 route 文件名。如果 collection 来自第三方包、必须保留宿主路由，则按最终签名排除：

```ts
export default defineNuxtConfig({
  apim: {
    collections: ['modules/demo-api'],
    exclude: ['GET /api/profile'],
  },
})
```

被排除的 handler 会同时从 Nitro 注册和生成的客户端类型中移除。

方法不同时不会冲突，例如 `GET /api/profile` 和 `POST /api/profile` 可以共存；宿主方法未声明时会按通配方法处理，可能与任意同路径 collection handler 冲突。
