# my-log（基于 Astro 的静态博客）

本项目是一个基于 **Astro + Tailwind + Svelte + Swup** 的静态博客站点。内容主要放在 `src/content/`，页面路由在 `src/pages/`，站点配置在 `src/config.ts` 与 `astro.config.mjs`。

这份 README 面向“维护/二次开发”，说明每个模块在哪、怎么改，以及 RSS/robots/sitemap/搜索等“接口”入口在哪里。

## 快速开始

### 环境要求

- **Node.js**：建议 `>= 20`
- **pnpm**：建议 `>= 9`（本项目强制使用 pnpm）

### 常用命令（在项目根目录执行）

- **安装依赖**：`pnpm install`
- **本地开发**：`pnpm dev`（默认 `http://localhost:4321`）
- **构建**：`pnpm build`（输出到 `dist/`，并运行 Pagefind 建索引）
- **预览构建产物**：`pnpm preview`
- **类型/规则检查**：`pnpm check` 或 `pnpm type-check`
- **格式化/修复**：`pnpm format` / `pnpm lint`
- **新建文章**：`pnpm new-post <filename>`（生成到 `src/content/posts/`）

## 项目结构地图（最常改的都在这里）

- **站点配置**：`src/config.ts`
  - **站点标题/语言/主题色**：`siteConfig`
  - **顶栏导航**：`navBarConfig`（例如“数据库”入口就加在这里）
  - **个人资料/头像/外链**：`profileConfig`
- **Astro 全局配置**：`astro.config.mjs`
  - **站点地址/部署 basePath**：`site` / `base`
  - **Markdown/rehype/remark 插件**：都在此注册
  - **Sitemap/Swup/Expressive Code** 等集成也在这里
- **内容（文章/页面原文）**：`src/content/`
  - **文章**：`src/content/posts/*.md`
  - **站点说明页（about 等）**：`src/content/spec/*.md`
  - **内容 schema**：`src/content/config.ts`（Frontmatter 字段校验）
- **页面路由（“接口”也在这里）**：`src/pages/`
  - **文章详情页**：`src/pages/posts/[...slug].astro`
  - **分页首页/列表**：`src/pages/[...page].astro`
  - **归档**：`src/pages/archive.astro`
  - **关于**：`src/pages/about.astro`
  - **数据库页面**：`src/pages/database.astro`（本项目新增）
  - **RSS 接口**：`src/pages/rss.xml.ts`
  - **robots.txt 接口**：`src/pages/robots.txt.ts`
- **组件**：`src/components/`
  - **Markdown 容器（含复制按钮脚本）**：`src/components/misc/Markdown.astro`
  - **导航栏**：`src/components/Navbar.astro`
  - **搜索面板**：`src/components/Search.svelte`
  - **侧边栏/目录/标签/分类**：`src/components/widget/*`
- **工具函数**：`src/utils/`
  - **文章读取/排序/上一页下一页**：`src/utils/content-utils.ts`
  - **URL 拼接（会处理 basePath）**：`src/utils/url-utils.ts`
  - **日期格式**：`src/utils/date-utils.ts`
  - **主题设置（亮暗色/色相）**：`src/utils/setting-utils.ts`
- **样式**：`src/styles/`（主样式、markdown、滚动条、过渡等）
- **静态资源**：`public/`（如图表 `public/charts/*`）

## 写文章 / 改内容

### 新建文章

1. 执行：`pnpm new-post my-article`
2. 编辑生成的文件：`src/content/posts/my-article.md`

### 文章 Frontmatter（字段来自 `src/content/config.ts`）

```yaml
---
title: 标题
published: 2025-12-15
updated: 2025-12-16
description: ''
image: ''
tags: [llm]
category: '归档'
draft: false
lang: '' # 仅在文章语言与站点默认语言不同才需要写
---
```

### 草稿与发布

- 生产环境（`pnpm build`）会自动隐藏 `draft: true` 的文章（逻辑在 `src/utils/content-utils.ts`）
- 本地开发默认会显示全部文章（方便预览草稿）

## “接口”都在哪里（RSS / robots / sitemap / 搜索）

- **RSS**：`src/pages/rss.xml.ts`
  - 使用 `@astrojs/rss` 生成 `rss.xml`
  - 内容来源：`getSortedPosts()`（`src/utils/content-utils.ts`）
- **robots.txt**：`src/pages/robots.txt.ts`
  - 会把 sitemap 链接写入 robots（依赖 `import.meta.env.SITE`）
- **sitemap**：由 `@astrojs/sitemap` 在构建时生成（配置在 `astro.config.mjs`）
- **站内搜索（Pagefind）**：
  - 构建命令：`pnpm build` 里会执行 `pagefind --site dist`
  - Pagefind 配置：`pagefind.yml`
  - 页面上哪些内容参与索引：`src/components/misc/Markdown.astro` 里的 `data-pagefind-body`

## 数据库（Database）栏目：段落库如何维护

本项目提供了一个“数据库”栏目，用于集中存放可复用的原文/片段数据，并供页面脚本读取。

- **段落库数据文件**：`src/database/ab-excerpts.ts`
  - 结构：`{ k: string; m: string; t: string }`
    - `k`：唯一 key
    - `m`：模型名（用于“揭晓”）
    - `t`：展示给读者的段落文本
- **数据库展示页面**：`src/pages/database.astro`
  - 路由：`/database/`
  - 作用：把 `abExcerpts` 以表格形式展示，便于校对与维护

### A/B 盲测投票（红楼梦报告那篇）

- **文章文件**：`src/content/posts/report.md`
  - A/B 两个块会从段落库里随机抽取两段
  - 规则：
    - 刷新会重新抽样（未作答时）
    - 一旦开始作答，会锁定题面，避免投到一半刷新导致题目变了
    - A/B 强制来自不同模型（`m` 不相同）
- **段落库注入到页面**：`src/pages/posts/[...slug].astro`
  - 对 `entry.slug === "report"` 时，会注入 `window.__AB_EXCERPTS__`

### 复用到其他文章（不止红楼梦）

如果你想在其他文章也做“随机 A/B 对比 + 先选后揭晓”，有两种做法：

- **做法 A（最快）**：在目标文章的 Markdown 里复制 `report.md` 的那段 HTML/CSS/JS，然后：
  - 改 `data-blindvote-id` 为新的唯一值
  - 在 `src/pages/posts/[...slug].astro` 里把注入条件从 `entry.slug === "report"` 扩展为多个 slug
- **做法 B（推荐，可维护性更好）**：把盲测组件做成独立的 Astro/Svelte 组件（例如 `src/components/BlindVote.astro`），Markdown 里只写一行指令/组件引用。需要我可以进一步帮你抽组件。

## 部署相关（site/basePath）

部署到 GitHub Pages / 子路径时，注意：

- `astro.config.mjs`：
  - `site`：站点根地址
  - `base`：子路径（例如本项目是 `/my-log`）
- 内部链接请尽量使用 `@utils/url-utils.ts` 的 `url()` 来拼接，以自动处理 basePath。

## 其他说明

- `dist/`：构建产物目录（通常不手改）
- `public/`：静态资源目录（直接按路径引用）
- `docs/`：上游模板的多语言文档（可保留或删除）

