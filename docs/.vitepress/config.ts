import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'apim',
  description: 'Typed API collections for Nuxt and Nitro',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: '/apim-mark.svg',
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'Nuxt 模块', link: '/packages/nuxt' },
      { text: 'CLI', link: '/packages/cli' },
      { text: '参考', link: '/reference/configuration' },
      { text: 'GitHub', link: 'https://github.com/hzgotb/apim' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '概览', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' },
          ],
        },
      ],
      '/packages/': [
        {
          text: '包',
          items: [
            { text: '@hzgotb/apim-nuxt', link: '/packages/nuxt' },
            { text: '@hzgotb/apim-cli', link: '/packages/cli' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '配置', link: '/reference/configuration' },
            { text: 'Collection 模型', link: '/reference/collection' },
            { text: 'ApiModuleMeta 模型', link: '/reference/api-module-meta' },
            { text: 'Ignore 规则', link: '/reference/ignore' },
            { text: '路由冲突', link: '/reference/route-conflicts' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/hzgotb/apim' }],
    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
