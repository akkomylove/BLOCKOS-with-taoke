import type { Block, BlockType } from '@/types/block';
import { nanoid } from 'nanoid';

interface PresetDocument {
  id: string;
  title: string;
  icon: string;
  description: string;
  blocks: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>[];
}

function createBlocks(blocks: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>[]): Block[] {
  const now = Date.now();
  return blocks.map((b, i) => ({
    ...b,
    id: nanoid(),
    createdAt: now + i,
    updatedAt: now + i,
  }));
}

export const PRESET_DOCUMENTS: PresetDocument[] = [
  {
    id: 'doc-prd',
    title: '产品需求文档（PRD）',
    icon: '📋',
    description: 'CircleLight 电商平台完整产品需求文档',
    blocks: [
      {
        type: 'text', title: '产品概述', content: '# CircleLight 电商平台 PRD\n\n## 产品定位\n\nCircleLight 是一款面向中小企业的 B2C 电商平台，主打轻量化部署和快速上手。目标客户为年销售额 500 万-5000 万的零售商家。\n\n## 核心价值主张\n\n- **低成本启动**：SaaS 模式，按月订阅，无需自建服务器\n- **全渠道运营**：支持微信小程序、APP、H5 三端统一管理\n- **智能经营**：内置数据分析看板，帮助商家洞察销售趋势', meta: { tags: ['PRD', '产品需求'] }, parentId: null, order: 0, x: 40, y: 40, width: 520, collapsed: false,
      },
      {
        type: 'text', title: '用户画像', content: '## 目标用户画像\n\n### 商家用户\n\n| 维度 | 描述 |\n|------|------|\n| 身份 | 夫妻店、小型连锁、品牌代理商 |\n| 年龄 | 30-50 岁为主 |\n| 技术能力 | 中低，对复杂后台系统有抵触 |\n| 核心诉求 | 简单高效地卖货，不关心技术细节 |\n\n### 消费者用户\n\n| 维度 | 描述 |\n|------|------|\n| 身份 | 追求性价比的年轻消费者 |\n| 年龄 | 25-40 岁 |\n| 购物习惯 | 移动端为主，社交分享驱动 |\n| 核心诉求 | 品质保障、物流快速、售后无忧 |', meta: { tags: ['PRD', '用户画像'] }, parentId: null, order: 1, x: 40, y: 320, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '核心功能清单', content: '## 核心功能优先级\n\n### P0 - 必须上线\n\n1. **商品管理**：上架、下架、编辑、库存同步\n2. **订单处理**：创建、支付、发货、退款全流程\n3. **用户系统**：注册、登录、会员等级\n4. **支付集成**：微信支付、支付宝\n\n### P1 - 第一迭代\n\n5. **优惠券系统**：满减券、折扣券\n6. **物流追踪**：实时物流信息推送\n7. **数据分析**：销售报表、用户分析\n\n### P2 - 第二迭代\n\n8. **营销工具**：秒杀、拼团、积分商城\n9. **多店管理**：连锁店统一运营\n10. **API 开放**：第三方系统对接', meta: { tags: ['PRD', '功能清单'] }, parentId: null, order: 2, x: 40, y: 600, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '验收标准', content: '## 验收标准（Definition of Done）\n\n### 功能验收\n\n- 所有 P0 功能通过功能测试\n- 核心流程（下单→支付→发货→确认收货）闭环验证\n- 支付成功率 ≥ 99.5%\n\n### 性能验收\n\n- 首页加载时间 ≤ 2 秒\n- 搜索响应时间 ≤ 500ms\n- 支持日均 10,000 订单峰值\n\n### 安全验收\n\n- 支付接口符合 PCI DSS 标准\n- 用户密码加密存储（bcrypt）\n- 敏感数据脱敏处理', meta: { tags: ['PRD', '验收标准'] }, parentId: null, order: 3, x: 560, y: 40, width: 480, collapsed: false,
      },
    ],
  },
  {
    id: 'doc-tech',
    title: '技术方案文档',
    icon: '💻',
    description: 'CircleLight 电商平台技术架构设计',
    blocks: [
      {
        type: 'text', title: '技术架构总览', content: '# 技术方案文档\n\n## 整体架构\n\n采用前后分离架构，后端基于 Node.js 微服务，前端基于 Next.js SSR/SSG 混合渲染。\n\n```\n┌─────────────────────────────────────────────────┐\n│                    CDN + Nginx                  │\n│              (静态资源 + 反向代理)                │\n└─────────────────────────────────────────────────┘\n                          ↓\n┌─────────────────────────────────────────────────┐\n│                  Next.js Frontend               │\n│            (SSR + SSG + API Routes)             │\n└─────────────────────────────────────────────────┘\n                          ↓\n┌─────────────────────────────────────────────────┐\n│                 API Gateway (Kong)               │\n│              (统一入口 + 鉴权 + 限流)             │\n└─────────────────────────────────────────────────┘\n```\n\n## 技术选型\n\n| 层级 | 技术 | 版本 | 说明 |\n|------|------|------|------|\n| 前端框架 | Next.js | 15.x | SSR/SSG |\n| UI 框架 | Tailwind CSS | 3.x | 原子化样式 |\n| 状态管理 | Zustand | 5.x | 轻量级 |\n| 后端运行时 | Node.js | 20 LTS | - |\n| ORM | Prisma | 5.x | 类型安全 |\n| 数据库 | PostgreSQL | 16 | 主数据 |\n| 缓存 | Redis | 7.x | 会话/队列 |\n| 搜索 | Elasticsearch | 8.x | 商品搜索 |', meta: { tags: ['技术方案', '架构'] }, parentId: null, order: 0, x: 40, y: 40, width: 560, collapsed: false,
      },
      {
        type: 'text', title: 'API 接口规范', content: '## RESTful API 设计规范\n\n### Base URL\n```\nhttps://api.circlelight.com/v1\n```\n\n### 认证方式\n- Header: `Authorization: Bearer <JWT_TOKEN>`\n- JWT 有效期：24 小时\n- Refresh Token 有效期：7 天\n\n### 通用响应格式\n```json\n{\n  "code": 0,\n  "message": "success",\n  "data": {}\n}\n```\n\n### 核心接口列表\n\n| 模块 | 接口前缀 | 说明 |\n|------|----------|------|\n| 用户 | /api/users | 注册、登录、详情 |\n| 商品 | /api/products | CRUD、搜索、分类 |\n| 订单 | /api/orders | 创建、支付、发货、退款 |\n| 支付 | /api/payments | 微信、支付宝、银联 |\n| 物流 | /api/logistics | 追踪、物流公司 |', meta: { tags: ['技术方案', 'API'] }, parentId: null, order: 1, x: 40, y: 360, width: 520, collapsed: false,
      },
      {
        type: 'text', title: '数据库设计', content: '## 核心数据模型\n\n### 用户表（users）\n\n| 字段 | 类型 | 说明 |\n|------|------|------|\n| id | UUID | 主键 |\n| phone | VARCHAR(11) | 手机号，唯一 |\n| password_hash | VARCHAR(255) | bcrypt 加密 |\n| nickname | VARCHAR(50) | 昵称 |\n| level | INT | 会员等级 1-5 |\n| created_at | TIMESTAMP | 创建时间 |\n\n### 订单表（orders）\n\n| 字段 | 类型 | 说明 |\n|------|------|------|\n| id | UUID | 主键 |\n| order_no | VARCHAR(32) | 订单号，唯一 |\n| user_id | UUID | 关联用户 |\n| total_amount | DECIMAL(10,2) | 订单总额 |\n| status | ENUM | pending/paid/shipped/completed/refunded |\n| created_at | TIMESTAMP | 创建时间 |\n\n### 索引设计\n\n- users: phone (UNIQUE), created_at\n- orders: order_no (UNIQUE), user_id, status, created_at\n- products: category_id, created_at', meta: { tags: ['技术方案', '数据库'] }, parentId: null, order: 2, x: 40, y: 680, width: 520, collapsed: false,
      },
    ],
  },
  {
    id: 'doc-ui',
    title: 'UI 设计规范',
    icon: '🎨',
    description: 'CircleLight 电商平台 UI/UX 设计规范',
    blocks: [
      {
        type: 'text', title: '设计原则', content: '# UI 设计规范\n\n## 设计理念\n\n**简洁、专业、可信赖** — 打造让商家安心经营的电商后台\n\n## 色彩系统\n\n| 用途 | 色值 | 说明 |\n|------|------|------|\n| 主色 | #6366F1 | 品牌色，Indigo |\n| 辅助色 | #10B981 | 成功状态 |\n| 警示色 | #F59E0B | 警告状态 |\n| 错误色 | #EF4444 | 错误状态 |\n| 背景色 | #F9FAFB | 页面背景 |\n| 文字主色 | #111827 | 主要文字 |\n| 文字次色 | #6B7280 | 次要文字 |\n\n## 字体规范\n\n| 用途 | 字体 | 字号 |\n|------|------|------|\n| 标题 H1 | Inter | 24px / 700 |\n| 标题 H2 | Inter | 20px / 600 |\n| 正文 | Inter | 14px / 400 |\n| 辅助文字 | Inter | 12px / 400 |\n| 数字金额 | DM Sans | 16px / 500 |', meta: { tags: ['UI规范', '设计原则'] }, parentId: null, order: 0, x: 40, y: 40, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '组件规范', content: '## 基础组件规范\n\n### 按钮\n\n| 类型 | 背景色 | 文字色 | 用途 |\n|------|--------|--------|------|\n| Primary | #6366F1 | #FFFFFF | 主要操作 |\n| Secondary | #F3F4F6 | #374151 | 次要操作 |\n| Danger | #EF4444 | #FFFFFF | 危险操作 |\n| Ghost | transparent | #6366F1 | 文字按钮 |\n\n### 圆角\n\n| 组件 | 圆角值 |\n|------|--------|\n| 按钮 | 8px |\n| 卡片 | 12px |\n| 输入框 | 6px |\n| 模态框 | 16px |\n\n### 间距系统\n\n基于 4px 网格：4、8、12、16、24、32、48px', meta: { tags: ['UI规范', '组件'] }, parentId: null, order: 1, x: 40, y: 280, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '页面布局规范', content: '## 页面布局\n\n### 电商后台布局\n\n```\n┌──────────────────────────────────────────────────┐\n│  顶部导航栏（64px）                               │\n│  Logo | 搜索 | 通知 | 用户头像                   │\n├────────────┬─────────────────────────────────────┤\n│            │                                      │\n│  侧边导航   │       主内容区域                      │\n│  (200px)   │                                      │\n│            │  ┌────────────────────────────────┐   │\n│  商品管理   │  │  页面标题 + 操作按钮            │   │\n│  订单管理   │  ├────────────────────────────────┤   │\n│  用户管理   │  │                                │   │\n│  数据分析   │  │       内容区域                   │   │\n│  营销工具   │  │                                │   │\n│  设置       │  └────────────────────────────────┘   │\n│            │                                      │\n└────────────┴─────────────────────────────────────┘\n```\n\n### 响应式断点\n\n| 设备 | 宽度 | 侧边栏 |\n|------|------|--------|\n| Desktop | ≥1280px | 常驻 |\n| Tablet | 768-1279px | 可折叠 |\n| Mobile | <768px | 抽屉模式 |', meta: { tags: ['UI规范', '布局'] }, parentId: null, order: 2, x: 40, y: 560, width: 520, collapsed: false,
      },
    ],
  },
  {
    id: 'doc-data',
    title: '数据分析报告',
    icon: '📊',
    description: 'CircleLight 电商平台数据分析与洞察',
    blocks: [
      {
        type: 'text', title: '数据概览', content: '# 数据分析报告\n\n## 核心指标摘要\n\n| 指标 | 本周 | 上周 | 环比 |\n|------|------|------|------|\n| GMV | ¥328,500 | ¥285,200 | +15.2% |\n| 订单数 | 1,847 | 1,623 | +13.8% |\n| 客单价 | ¥177.8 | ¥175.7 | +1.2% |\n| 转化率 | 3.2% | 2.9% | +0.3pp |\n| 新增用户 | 456 | 389 | +17.2% |\n\n## 用户行为洞察\n\n### 购物车转化漏斗\n\n```\n浏览商品 → 加入购物车 → 提交订单 → 完成支付\n  100%           45%          28%        85%\n```\n\n### 高峰时段分析\n\n- **下单高峰**：20:00-22:00（占比 35%）\n- **浏览高峰**：9:00-11:00（占比 28%）\n- **客服咨询**：14:00-16:00（占比 25%）', meta: { tags: ['数据分析', '概览'] }, parentId: null, order: 0, x: 40, y: 40, width: 520, collapsed: false,
      },
      {
        type: 'text', title: '商品分析', content: '## 商品分析\n\n### 畅销商品 TOP5\n\n| 排名 | 商品名称 | 销量 | GMV | 库存 |\n|------|----------|------|-----|------|\n| 1 | 品牌运动鞋 | 328 | ¥98,400 | 120 |\n| 2 | 无线蓝牙耳机 | 256 | ¥51,200 | 85 |\n| 3 | 智能手环 | 198 | ¥29,700 | 200 |\n| 4 | 防晒霜套装 | 187 | ¥18,700 | 300 |\n| 5 | 零食大礼包 | 165 | ¥9,900 | 500 |\n\n### 滞销商品预警\n\n| 商品名称 | 库龄 | 销量/周 | 建议 |\n|----------|------|---------|------|\n| 老年机 | 45天 | 2 | 促销清仓 |\n| 传统手表 | 60天 | 1 | 下架处理 |', meta: { tags: ['数据分析', '商品'] }, parentId: null, order: 1, x: 40, y: 320, width: 520, collapsed: false,
      },
      {
        type: 'text', title: '用户分析', content: '## 用户分析\n\n### 会员等级分布\n\n| 等级 | 名称 | 人数 | 占比 | 贡献GMV |\n|------|------|------|------|----------|\n| Lv1 | 新用户 | 8,234 | 45% | 12% |\n| Lv2 | 活跃用户 | 5,678 | 31% | 28% |\n| Lv3 | 忠实用户 | 2,890 | 16% | 35% |\n| Lv4 | VIP | 1,023 | 6% | 18% |\n| Lv5 | SVIP | 156 | 1% | 7% |\n\n### 用户留存分析\n\n| 维度 | 数值 | 行业均值 |\n|------|------|----------|\n| 次日留存 | 42% | 35% |\n| 7日留存 | 28% | 22% |\n| 30日留存 | 15% | 12% |\n\n### RFM 分析结果\n\n- **高价值用户**：1,234 人（占比 6.8%），贡献 52% GMV\n- **潜力用户**：2,567 人，需重点运营\n- **流失风险用户**：890 人，需召回', meta: { tags: ['数据分析', '用户'] }, parentId: null, order: 2, x: 40, y: 620, width: 520, collapsed: false,
      },
    ],
  },
  {
    id: 'doc-test',
    title: '测试计划',
    icon: '🧪',
    description: 'CircleLight 电商平台测试计划与用例',
    blocks: [
      {
        type: 'text', title: '测试策略', content: '# 测试计划\n\n## 测试目标\n\n确保 CircleLight 电商平台核心功能稳定、可交付上线。\n\n## 测试范围\n\n### 功能测试\n\n- [ ] 用户注册/登录流程\n- [ ] 商品 CRUD 操作\n- [ ] 购物车全流程\n- [ ] 订单创建与状态流转\n- [ ] 支付接口对接\n- [ ] 退款退货流程\n\n### 性能测试\n\n| 场景 | 目标 | 测试方法 |\n|------|------|----------|\n| 首页加载 | ≤2s | Lighthouse |\n| 搜索响应 | ≤500ms | JMeter |\n| 并发下单 | 1000 TPS | LoadRunner |\n\n### 安全测试\n\n- [ ] SQL 注入防护\n- [ ] XSS 跨站脚本\n- [ ] CSRF 防护\n- [ ] 支付接口签名验证', meta: { tags: ['测试计划', '策略'] }, parentId: null, order: 0, x: 40, y: 40, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '测试用例', content: '## 核心测试用例\n\n### TC001 - 用户注册\n\n| 字段 | 值 | 预期结果 |\n|------|-----|----------|\n| 手机号 | 13800138000 | 发送验证码 |\n| 验证码 | 123456 | 验证通过 |\n| 密码 | Pass123! | 创建成功 |\n\n### TC002 - 商品搜索\n\n| 场景 | 输入 | 预期 |\n|------|------|------|\n| 精确搜索 | 商品名称 | 返回精确结果 |\n| 模糊搜索 | 品牌名 | 返回相关商品 |\n| 无结果 | 不存在的词 | 提示无结果 |\n\n### TC003 - 支付流程\n\n```\n测试步骤：\n1. 选择商品加入购物车\n2. 提交订单\n3. 选择微信支付\n4. 调用支付接口\n5. 模拟支付回调\n6. 验证订单状态变更\n\n预期：订单状态 → paid\n```', meta: { tags: ['测试计划', '用例'] }, parentId: null, order: 1, x: 40, y: 320, width: 480, collapsed: false,
      },
      {
        type: 'text', title: '测试环境', content: '## 测试环境配置\n\n### 环境信息\n\n| 环境 | 用途 | 域名 |\n|------|------|------|\n| Dev | 开发自测 | dev.circlelight.local |\n| Test | 功能测试 | test.circlelight.com |\n| Staging | 预发布 | staging.circlelight.com |\n| Production | 正式环境 | www.circlelight.com |\n\n### 数据库准备\n\n```sql\n-- 初始化测试数据\nINSERT INTO products (name, price, stock) \nVALUES (\'测试商品\', 99.00, 1000);\n\n-- 清理脚本\nDELETE FROM orders WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);\n```\n\n### 里程碑\n\n| 阶段 | 开始 | 结束 | 负责人 |\n|------|------|------|--------|\n| 单元测试 | 3月1日 | 3月7日 | @测试团队 |\n| 集成测试 | 3月8日 | 3月14日 | @测试团队 |\n| 系统测试 | 3月15日 | 3月21日 | @测试团队 |\n| UAT | 3月22日 | 3月28日 | @业务方 |', meta: { tags: ['测试计划', '环境'] }, parentId: null, order: 2, x: 40, y: 600, width: 520, collapsed: false,
      },
    ],
  },
];

export function getPresetDocumentBlocks(docId: string): Block[] {
  const doc = PRESET_DOCUMENTS.find(d => d.id === docId);
  if (!doc) return [];
  return createBlocks(doc.blocks);
}
