# BlockOS - AI 原生无界文档系统

> 赛道四 · 无界文档 π（半命题）参赛作品  
> 选手：曹琅 · 杜诺琦 · 伍菲琪

---

## 一句话定位

BlockOS 是一个以 **Block 为原子**、**AI 为副驾**、**决策可追溯**的 AI 原生无界文档系统——让同一份原文在不被改写的前提下，按角色折叠呈现不同视角，并把 AI 从「对话者」升级为拥有独立画布的「副驾操作者」。

## 核心能力

| 能力 | 说明 |
|------|------|
| **多角色折叠** | 同一份文档，按产品经理 / UI设计师 / 前端 / 后端 / 测试等角色自动折叠呈现 |
| **AI 副驾** | AI 拥有独立画布，可自主创建、编辑、关联 Block，而非仅对话 |
| **决策溯源** | 所有 AI 操作留痕，可回溯、可审计 |
| **文档关联** | 多文档智能关联分析，按角色推荐阅读优先级 |
| **工作流分析** | 基于文档内容自动拆解任务并分配到角色 |

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **状态管理**: Zustand + Immer
- **拖拽**: @dnd-kit
- **AI 接口**: 阿里云 DashScope (千问 Qwen3-8B)
- **数据库**: sql.js (SQLite 内存模式)
- **部署**: 腾讯云轻量应用服务器

## 快速开始

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/akkomylove/BLOCKOS-with-taoke.git
cd BLOCKOS-with-taoke

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 8000 端口）
./start.bat
```

浏览器自动打开 http://localhost:8000

### 环境变量

创建 `.env.local`：

```bash
# AI 配置（阿里云 DashScope）
SILICONFLOW_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
SILICONFLOW_API_KEY=sk-你的阿里云密钥
AI_MODEL=qwen3-8b

# NextAuth
AUTH_SECRET=你的随机密钥
```

### 生产部署

```bash
# 构建
npm run build

# 启动（端口 8000）
npm start -- --port 8000
```

或使用 PM2：

```bash
pm2 start ecosystem.config.js
```

## 项目结构

```
blockOS/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React 组件
│   ├── lib/              # 工具库
│   ├── store/            # Zustand 状态管理
│   └── types/            # TypeScript 类型
├── public/               # 静态资源
├── deploy/               # 部署脚本
└── start.bat             # Windows 一键启动
```

## 演示数据

项目内置 5 份预设文档和 5 人研发团队：

- **PRD** - 电商平台开发项目需求文档
- **技术方案** - 系统架构设计
- **UI 设计规范** - 视觉和交互规范
- **数据分析报告** - 用户行为分析
- **测试计划** - 功能测试和性能测试

团队成员：产品经理、UI设计师、前端开发、后端开发、测试工程师

## 部署指南

详见 [deploy/tencent-lighthouse/README.md](deploy/tencent-lighthouse/README.md)

## 许可证

MIT License
