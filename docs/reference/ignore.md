# Ignore 规则

ignore 支持 glob 模式，有两个作用域：

```ts
export default defineApiModule({
  name: 'demo',
  ignore: ['**/types/**', '**/*.types.*'],
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
      ignore: ['**/*.internal.*'],
    },
  ],
})
```

默认情况下 handler 分组继承 collection 规则，并在后面追加自己的规则。

## 重置继承

如果 handler 分组的第一个规则是 `!...`，它会清空 collection 级规则，只使用后续规则：

```ts
{
  dir: 'runtime/server',
  clientPrefix: '/api',
  ignore: ['!...', '**/types/**'],
}
```

`!...` 只允许出现在 handler 分组 ignore 的第一项，不能放在 collection ignore 中，也不能出现在 handler 分组的其他位置。
