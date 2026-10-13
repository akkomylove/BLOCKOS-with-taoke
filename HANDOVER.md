# 📋 BlockOS 项目技术交接与演进备忘录 (HANDOVER.md)

> **当前基准版本**：`v1.0.0-baseline` (Git Tag: `v1.0.0-baseline`)  
> **更新时间**：2026-10-13  
> **项目定位**：基于 `(Agent + Block) × AI = 无界生产力` 哲学的下一代企业级可编程智能协作画布系统。

---

## 🎯 一、 基准版本里程碑与系统基线 (Baseline Release Status)

当前版本已完成第一批（第 1—8 项，配合 28、29 项）核心数据安全与保存链路重构：
- **测试基准**：Vitest 13 套测试套件、**185 项单元与集成测试 100% 绿色通过**（新增 20 项核心测试用例）；
- **构建基准**：Next.js 15 全量 38 个路由与中间件生产构建 `npm run build` 0 错误通过；
- **保存链路打通**：服务端补齐 `PUT /api/pages` 与 `PUT /api/pages/[id]/blocks`，支持 Block 全量布局属性（x/y/w/h/collapsed/title/groupId）持久化；前端工具栏显式提供“保存中/已保存/失败重试”状态气泡；
- **并发乐观锁**：页面与 Block 表结构支持 `version` 自动递增与冲突检测，并发旧版本覆盖自动返回 409 Conflict；
- **认证安全加固**：会话全面采用 HMAC-SHA256 服务端签名，篡改 Cookie 强制 401 拦截；生产环境阻断未授权快捷登录；
- **RBAC 统一落权**：Owner/Admin/Member/Viewer 四级权限矩阵落实，Viewer 只读成员强拦截增删改任务，普通 Member 强拦截提权与邀请；
- **代码沙箱隔离**：彻底剥离子进程系统环境变量，绝不暴露应用敏感密钥；引入 3 秒看门狗超时熔断与配额保护；
- **XSS 防护与清洗**：移除 ToggleBlock 内联 HTML 渲染；引入通用 `sanitizeHtml` 库剥离脚本；加入大文件保护拦截；
- **缓存隔离与软删除**：画布 localStorage 按用户 ID 隔离；补齐页面/任务软删除与回收站一键恢复接口。

---

## 🏗️ 二、 核心架构与技术栈拓扑 (Architecture Topology)

- **前端技术栈**：Next.js 15 (App Router), React 19, Tailwind CSS 3, Lucide Icons, dnd-kit (拖拽系统);
- **全局状态管理**：Zustand 5 (`src/store/blockStore.ts` 按用户隔离命名空间存储，集成同步保存感知与重试);
- **AI 智能体引擎**：Vercel AI SDK (`ai`), 智谱开放平台 API (`glm-4.7-flash` 模型);
- **代码执行沙箱**：Node.js 安全隔离子进程，剥离系统环境变量，3秒超时熔断看门狗;
- **数据持久化与安全**：Hybrid WebAssembly SQLite (sql.js) + Neon Postgres 双向同步，HMAC-SHA256 签名会话，RBAC 细粒度拦截。

---

## 🗺️ 三、 核心源码目录与关键文件地图 (Code Map)

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                # AI 接口集群 (block-action, copilot, analyze, chat, 等)
│   │   ├── auth/              # 会话鉴权 (HMAC-SHA256 签名、登出、用户信息)
│   │   ├── pages/             # 页面与 Block 实体级同步 API (支持 PUT、版本乐观锁、软删除与恢复)
│   │   ├── run-code/          # 安全隔离代码沙箱 (剥离环境变量、3s超时看门狗)
│   │   └── tasks/             # 任务与协同 API (RBAC 权限守卫、软删除与恢复)
│   ├── page.tsx               # 画布主应用入口
│   └── layout.tsx             # 全局根布局
├── components/
│   ├── BlockEditor.tsx        # 无界画布主引擎 (平移漫游、框选、拖拽拉伸、事件分发)
│   ├── CanvasMinimap.tsx      # 鹰眼缩略图导航器 (包围盒计算、微缩渲染、拖拽漫游、全览居中)
│   ├── SortableBlock.tsx      # 单卡片骨架、拖拽手柄、AI 专属菜单触发器
│   ├── Toolbar.tsx            # 响应式全局指挥顶栏 (显式保存状态胶囊、更多下拉收纳、用户状态)
│   └── blocks/                # 原子 Block 渲染器 (纯文本受控渲染、无 XSS 隐患)
├── store/
│   └── blockStore.ts          # 画布原子状态树、用户隔离存储、保存状态感知与重试
└── lib/
    ├── auth-utils.ts          # HMAC 会话签名验证、统一 RBAC checkProjectPermission 守卫
    ├── db.ts                  # SQLite 幂等结构迁移 (version, deleted_at, 完整 Block 列)
    └── sanitize.ts            # 全局 XSS 净化与输入安全防御库
```

---

## 💡 四、 踩坑与高价值解法备忘录 (Cross-Project Knowledge Base)

在本项目开发与调优中沉淀的典型疑难问题与跨项目通用解法：

### 1. HTTP 405 Method Not Allowed 静默失败治理
- **踩坑现象**：前端发起了 `PUT /api/pages` 或 `PUT /api/pages/[id]/blocks`，但服务端 Route Handler 仅导出了 `GET` 和 `POST`，导致网络面板返回 405，前端静默失败未报错但数据永久丢失。
- **解法备忘**：前后端契约必须严格 1:1 对齐。在 Route Handler 中显式导出 `PUT` 与 `POST`，并在 store 中维护显式 `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`，失败时在 UI 呈现错误胶囊与重试按钮。

### 2. Node.js 子进程环境变量泄露漏洞
- **踩坑现象**：`child_process.exec()` 默认会把应用进程的所有 `process.env`（包括大模型 API Key、数据库连接串、Session Secret）透传给外部执行代码，导致恶意用户通过打印环境变量即可盗取全站秘钥。
- **解法备忘**：调用子进程时必须显式指定白名单 `env: { PATH, LANG, NODE_ENV, TMPDIR }`，且在 Windows 下需通过 `err.killed` / `SIGTERM` / `ETIMEDOUT` 准确检测超时状态。

### 3. 多账号同一浏览器数据穿透
- **踩坑现象**：Zustand persist 使用固定 key `blockos-storage`，用户登出或切换账号时，旧账号的数据仍在本地展示。
- **解法备忘**：缓存 key 采用动态命名空间 `block-os-storage-${userId}`，在用户登录及初始化时根据当前会话载入独立缓存镜像。

---

## 🚀 五、 后续演进路线建议 (Next Phase Roadmap)

第二批（第 9—16 项）核心产品价值路线：
1. **结构化需求对象与业务级连线（第 9、10 项）**：
   - 需求稳定编号（REQ-001）、负责人、优先级与验收标准，让连线具备“实现/验证/依赖”语义；
2. **需求变更影响分析与高质量 AI 拆解（第 11、12 项）**：
   - 修改需求后自动沿拓扑链路高亮受影响的下游任务；拆解任务附带交付物与验收条件；
3. **团队角色匹配与交付状态流转（第 13、14 项）**：
   - 将“完成/验收/交付”状态解耦，引入“待验收、验收通过、退回”机制，杜绝简单勾选伪装交付；
4. **统一多视角数据源与团队邀请协同（第 15、16 项）**：
   - 文档、画布、看板、甘特图共享同一批领域对象；完善邀请链接与对象级讨论。
