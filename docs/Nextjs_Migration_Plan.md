# HTML 项目迁移至 Next.js + 独立后端全栈方案

本文件概述如何将当前的纯 HTML/Node.js 服务迁移至基于 **Next.js** 的前端和独立的后端服务，并补充移动端适配策略。

## 1. 项目目标
- 使用 Next.js 14（App Router）实现组件化和 SSR/SSG
- 后端拆分为独立服务（可选 NestJS、Express 或 Fastify），暴露 REST 或 GraphQL API
- 数据库使用 PostgreSQL 或 MySQL，配合 Prisma ORM
- 统一 TypeScript 代码风格，配置 CI/CD
- 全站响应式，关键页面可提供移动专版或 PWA

## 2. 现状审计
在迁移前应梳理现有页面、脚本和数据模型，形成《现状审计报告》。内容包括：
- 页面/模板清单
- JS/CSS 依赖矩阵
- 表单和接口请求列表
- 数据实体与字段关系
- 当前部署方式

## 3. 目录结构示例
```
root/
├─ apps/
│  ├─ web/            # Next.js
│  └─ api/            # 独立后端
├─ packages/          # 共享库
├─ docker/
└─ .github/workflows/
```

## 4. 数据层设计
1. 使用 `npx prisma init` 创建 `schema.prisma`
2. 绿地项目可 `prisma migrate dev`；已有数据库可 `prisma db pull`
3. 通过 `prisma db seed` 注入种子数据

## 5. API 设计范例
| 方法 | 路径 | 功能 |
| ---- | ---- | ---- |
| GET | /api/v1/articles | 文章列表 |
| POST | /api/v1/auth/login | 登录 |
| PUT | /api/v1/users/:id | 更新用户 |

采用统一错误格式 `{ code, message }`，并生成 Swagger 文档。

## 6. 前端迁移步骤
1. Server Components 用于营销/SEO 页面，Client Components 承载表单等交互
2. 使用 `fetch()` 在服务器获取数据，客户端可配合 `useSWR` 等库
3. 保留旧 URL，通过 301 重定向至新地址
4. 样式部分使用 Tailwind `@apply`，逐步移除冗余 CSS

## 7. 移动端适配
- Tailwind 默认断点：`sm(640px)`、`md(768px)`、`lg(1024px)` 等
- 导航在移动端改为汉堡菜单 + Drawer
- 表单纵向排布，点击热区不少于 48px
- 可选集成 `next-pwa` 实现离线缓存和安装功能

## 8. DevOps 与部署
- 利用 GitHub Actions 执行测试和构建
- `next build` 与后端构建分别生成镜像，通过 docker-compose 编排
- Prisma 迁移在容器启动时执行

## 9. 迁移排期（示例）
| 周次 | 内容 |
| ---- | ---- |
| 1 | 现状审计、技术栈确认 |
| 2 | Monorepo 初始化 |
| 3-4 | 数据库与 API MVP |
| 5-7 | 页面迁移与组件开发 |
| 8 | 移动端与性能优化 |
| 9 | 灰度发布 |
| 10 | 正式切流 |

以上方案可根据团队实际情况调整。
