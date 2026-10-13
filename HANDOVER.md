# 📋 BlockOS 项目技术交接与演进备忘录 (HANDOVER.md)

> **当前基准版本**：`v1.0.0-baseline` (Git Tag: `v1.0.0-baseline`)  
> **更新时间**：2026-10-13  
> **项目定位**：基于 `(Agent + Block) × AI = 无界生产力` 哲学的下一代企业级可编程智能协作画布系统。

---

## 🎯 一、 基准版本里程碑与系统基线 (Baseline Release Status)

当前版本已被项目决策者正式拍板定位为**稳定基准版本**：
- **测试基准**：Vitest 9 套测试套件、165 项单元测试 100% 绿色通过；
- **构建基准**：Next.js 全量 38 个路由（含 API、服务端渲染与静态页面）编译打包 0 错误；
- **大模型基准**：智谱 `GLM-4.7-Flash` 原生 Key 流式对接调通，支持毫秒级流式吐字；
- **布局基准**：彻底消除预置文档三组 Block 重叠，贯通 DOM 高度继承，支持智能下推避让；
- **交互基准**：配备鹰眼小地图（Canvas Minimap）、平滑新手导览与自适应折叠顶栏。

---

## 🏗️ 二、 核心架构与技术栈拓扑 (Architecture Topology)

- **前端技术栈**：Next.js 15 (App Router), React 19, Tailwind CSS 3, Lucide Icons, dnd-kit (拖拽系统);
- **全局状态管理**：Zustand 5 (`src/store/blockStore.ts` 结合 localStorage 持久化与水合版本控制);
- **AI 智能体引擎**：Vercel AI SDK (`ai`), 智谱开放平台 API (`glm-4.7-flash` 模型);
- **代码执行沙箱**：内置前端安全沙箱运行环境，支持 JavaScript / TypeScript / Python 模拟执行与控制台捕获;
- **数据持久化与契约**：Prisma ORM, SQLite/PostgreSQL 数据模型向下兼容。

---

## 🗺️ 三、 核心源码目录与关键文件地图 (Code Map)

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                # AI 接口集群 (block-action, copilot, analyze, chat, 等)
│   │   ├── pages/             # 页面与 Block CRUD API
│   │   └── teams/             # 团队与协同任务 API
│   ├── page.tsx               # 画布主应用入口
│   └── layout.tsx             # 全局根布局
├── components/
│   ├── BlockEditor.tsx        # 无界画布主引擎 (平移漫游、框选、拖拽拉伸、事件分发)
│   ├── CanvasMinimap.tsx      # 鹰眼缩略图导航器 (包围盒计算、微缩渲染、拖拽漫游、全览居中)
│   ├── SortableBlock.tsx      # 单卡片骨架、拖拽手柄、AI 专属菜单触发器
│   ├── OnboardingTour.tsx     # 沉浸式新手引导系统 (平滑定位、聚光灯镂空、快捷键、最小化胶囊)
│   ├── Toolbar.tsx            # 响应式全局指挥顶栏 (更多下拉收纳、角色透视、审计日志入口)
│   ├── BlockOSApp.tsx         # 应用主编排中枢 (状态水合、抽屉管理、全局快捷键)
│   └── blocks/                # 原子 Block 渲染器 (TextBlock, TodoBlock, CodeBlock, TableBlock 等)
├── config/
│   └── presetDocuments.ts     # 预置官方模板库 (新手指南 doc-guide, PRD, 技术方案等)
├── store/
│   └── blockStore.ts          # 画布原子状态树、页面树、Agent 规则引擎与历史撤销重做
└── lib/
    ├── ai-provider.ts         # 智谱 GLM 模型 Provider 适配层
    └── db.ts                  # 本地/服务端持久化驱动
```

---

## 💡 四、 踩坑与高价值解法备忘录 (Cross-Project Knowledge Base)

在本项目开发与调优中沉淀的典型疑难问题与跨项目通用解法：

### 1. Chrome 远程调试 (Remote Debugging) 404 阻断机制
- **踩坑现象**：在 `chrome://inspect/#remote-debugging` 勾选了“Allow remote debugging”，端口 9222 也能查到 Chrome 在监听，但外部工具请求 `/json/version` 持续返回 404，IDE 频繁弹窗提示重试。
- **解法备忘**：Chrome 128+ 引入了二次确认安全气泡。勾选后必须在**右上角扩展栏旁边点击紫色的「允许远程调试吗？」气泡并确认**，端点才会真正对外放行。若需彻底免确认，需在启动 Chrome 时注入 `--remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"` 参数。

### 2. 画布绝对定位体系下的多层 DOM 高度继承 (Height Inheritance)
- **踩坑现象**：外层容器设置了拉伸高度，把手跑到了底部，但内层卡片依然缩在自然内容高度，导致把手悬空形成“虚拟标”。
- **解法备忘**：绝对定位或弹性布局下的拉伸，必须自顶向下贯通 `h-full min-h-0 flex-1 flex flex-col`；同时在 store 更新高度时，引入**智能推移（Smart Push-down）**，检测下方垂直重叠的同列卡片并平移避让 60px，避免大卡片压顶。

### 3. Next.js 15 Turbopack 编译缓存与 build 冲突
- **踩坑现象**：在 `next dev --turbopack` 运行期间如果在同一目录执行 `npm run build`，生产构建会重写 `.next`，导致 dev 进程抛出 `build-manifest.json ENOENT` 500 报错。
- **解法备忘**：执行 production build 前先终止 dev 守护进程，或者构建完成后优雅重启 dev 进程。

### 4. 智谱大模型接入契约规范
- **踩坑现象**：智谱开放平台 API Key 格式为 `id.secret`，对接 Vercel AI SDK 的 OpenAI 兼容层时，Base URL 需标准对齐 `https://open.bigmodel.cn/api/paas/v4`，模型推荐使用免费且响应极速的 `glm-4.7-flash`。

---

## 🚀 五、 后续演进路线建议 (Next Phase Roadmap)

在确立当前基准版本后，推荐的后续功能迭代方向：
1. **多模态 Block 深度扩充**：
   - 增强白板（Excalidraw 矢量绘图嵌入）与脑图（Markmap 节点动态双向编辑）；
   - 增加图表 Block（Chart.js / ECharts 结构化数据一键可视化）；
2. **Agent 规则引擎可视化编排器**：
   - 目前规则在 `agentRules` 中以条件执行，后续可提供可视化“触发器 ➔ 动作流 (If-This-Then-That)”编排面板；
3. **多人协同与实时光标 (CRDT / WebSocket)**：
   - 支持多用户多人同屏在线协作，显示多方彩色鼠标光标与选区锁定；
4. **离线优先与云端多端同步**：
   - 强化 IndexedDB 离线缓存与服务端定期增量同步。
