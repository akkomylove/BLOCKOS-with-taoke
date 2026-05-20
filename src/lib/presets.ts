export interface PresetDoc {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  highlights: string[];
  recommendedWorkflow: string[];
  documentName: string;
  content: string;
  preview: string;
  charCount: number;
  sectionCount: number;
}

const PRESET_CONTENTS: Record<string, string> = {
  'product-requirements': `# 产品需求说明

## 业务背景与目标

描述当前业务面临的问题、机会点以及本次需求希望达成的核心目标。

## 功能范围与边界

### 包含功能
- 功能点 A
- 功能点 B

### 不包含功能
- 超出本次范围的功能 X

## 验收标准

| 验收项 | 标准 | 优先级 |
|--------|------|--------|
| 功能 A | 用户可完成核心流程 | P0 |
| 功能 B | 数据正确展示 | P1 |

## 里程碑计划

- 需求评审：第 1 周
- 开发完成：第 3 周
- 测试通过：第 4 周
- 上线发布：第 5 周
`,
  'technical-plan': `# 技术方案说明

## 系统架构

描述整体架构设计，包括核心模块划分和交互关系。

## 接口与状态流

### 核心接口
- POST /api/v1/resource
- GET /api/v1/resource/:id

### 状态流转
草稿 → 审核中 → 已发布 → 已归档

## 校验与重试

- 输入参数校验规则
- 失败重试策略（最多 3 次，间隔 1s）

## 上线与监控

- 灰度发布策略
- 核心监控指标
- 回滚方案
`,
  'data-review': `# 数据复盘摘要

## 核心指标总览

| 指标 | 本期 | 上期 | 环比 |
|------|------|------|------|
| DAU | 10w | 9w | +11% |
| 转化率 | 3.2% | 2.8% | +0.4pp |

## 渠道拆解

- 自然流量：占比 40%，环比 +5%
- 付费投放：占比 35%，环比 +15%
- 社交裂变：占比 25%，环比 -3%

## 漏斗问题

1. 首页 → 列表页：流失率 20%（偏高）
2. 列表页 → 详情页：流失率 15%（正常）
3. 详情页 → 下单：流失率 30%（需优化）

## 行动建议

1. 优化首页推荐算法
2. 调整付费投放预算分配
3. 详情页增加限时优惠提示
`,
  'release-checklist': `# 发布检查清单

## 发布前核对

- [ ] 代码已合并到 main 分支
- [ ] 单元测试通过率 100%
- [ ] 集成测试通过
- [ ] 性能基准测试无回归
- [ ] 配置项已更新

## 风险与回滚

| 风险点 | 影响 | 应对方案 |
|--------|------|----------|
| 数据库迁移失败 | 高 | 保留回滚脚本 |
| 第三方接口异常 | 中 | 降级开关 |

## 协作交接

- 运维：确认监控告警已配置
- 客服：准备 FAQ 文档
- 运营：确认活动配置正确
`,
  'weekly-brief': `# 运营周报摘要

## 周度趋势

本周核心指标整体向好，DAU 环比增长 11%，转化率提升 0.4 个百分点。

## 异常波动

- 周三 DAU 突降 15%，排查为 CDN 节点故障，已恢复
- 周五转化率异常升高，归因于限时活动上线

## 行动项

1. 推进首页推荐算法优化（负责人：产品经理，截止：下周三）
2. 完成 CDN 多节点冗余方案评审（负责人：工程师，截止：下周五）
3. 准备下周限时活动方案（负责人：运营，截止：下周一）
`,
};

function cleanPreviewLine(raw: string): string {
  let line = raw.trim();
  if (!line || line.startsWith('```') || line.startsWith('|')) return '';
  if (line.startsWith('#')) line = line.replace(/^#+\s*/, '');
  else if (line.startsWith('- ')) line = line.slice(2);
  return line.trim();
}

function buildPreview(content: string): string {
  const lines = content.split('\n').map(cleanPreviewLine).filter(Boolean);
  for (const line of lines.slice(1)) {
    if (line.length >= 18) return line.slice(0, 160);
  }
  return lines[0]?.slice(0, 160) || '';
}

export const PRESET_REGISTRY: PresetDoc[] = [
  {
    id: 'product-requirements',
    title: '产品需求说明',
    description: '围绕业务背景、岗位协作、需求范围与验收标准的真实产品型材料。',
    category: '产品向',
    difficulty: '中高复杂度',
    tags: ['需求评审', '验收口径', '跨岗位协作'],
    highlights: ['业务背景与目标', '功能范围与边界', '验收标准', '里程碑计划'],
    recommendedWorkflow: ['产品经理', '工程师', '数据分析员', 'CEO'],
    documentName: '产品需求说明.md',
    content: PRESET_CONTENTS['product-requirements'],
    preview: buildPreview(PRESET_CONTENTS['product-requirements']),
    charCount: PRESET_CONTENTS['product-requirements'].length,
    sectionCount: PRESET_CONTENTS['product-requirements'].split('\n').filter((l) => l.startsWith('## ')).length,
  },
  {
    id: 'technical-plan',
    title: '技术方案说明',
    description: '覆盖架构拆分、接口协议、发布策略和风险控制的工程方案文档。',
    category: '技术向',
    difficulty: '高复杂度',
    tags: ['接口协议', '发布回滚', 'AI 分析约束'],
    highlights: ['系统架构', '接口与状态流', '校验与重试', '上线与监控'],
    recommendedWorkflow: ['产品经理', '工程师', '测试', 'CEO'],
    documentName: '技术方案说明.md',
    content: PRESET_CONTENTS['technical-plan'],
    preview: buildPreview(PRESET_CONTENTS['technical-plan']),
    charCount: PRESET_CONTENTS['technical-plan'].length,
    sectionCount: PRESET_CONTENTS['technical-plan'].split('\n').filter((l) => l.startsWith('## ')).length,
  },
  {
    id: 'data-review',
    title: '数据复盘摘要',
    description: '聚焦指标拆解、渠道差异、归因问题和下一轮动作的数据复盘材料。',
    category: '数据向',
    difficulty: '中高复杂度',
    tags: ['指标复盘', '渠道表现', '归因分析'],
    highlights: ['核心指标总览', '渠道拆解', '漏斗问题', '行动建议'],
    recommendedWorkflow: ['产品经理', '工程师', '数据分析员', 'CEO'],
    documentName: '数据复盘摘要.md',
    content: PRESET_CONTENTS['data-review'],
    preview: buildPreview(PRESET_CONTENTS['data-review']),
    charCount: PRESET_CONTENTS['data-review'].length,
    sectionCount: PRESET_CONTENTS['data-review'].split('\n').filter((l) => l.startsWith('## ')).length,
  },
  {
    id: 'release-checklist',
    title: '发布检查清单',
    description: '面向上线前验收、灰度、回滚和对外沟通的简洁检查文档。',
    category: '协作向',
    difficulty: '中等',
    tags: ['上线准备', '风险检查', '回滚方案'],
    highlights: ['发布前核对', '风险与回滚', '协作交接'],
    recommendedWorkflow: ['产品经理', '工程师', '测试', 'CEO'],
    documentName: '发布检查清单.md',
    content: PRESET_CONTENTS['release-checklist'],
    preview: buildPreview(PRESET_CONTENTS['release-checklist']),
    charCount: PRESET_CONTENTS['release-checklist'].length,
    sectionCount: PRESET_CONTENTS['release-checklist'].split('\n').filter((l) => l.startsWith('## ')).length,
  },
  {
    id: 'weekly-brief',
    title: '运营周报摘要',
    description: '围绕周度指标、波动说明和下一步动作整理的运营复盘文档。',
    category: '数据向',
    difficulty: '中等',
    tags: ['周报', '指标监控', '复盘'],
    highlights: ['周度趋势', '异常波动', '行动项'],
    recommendedWorkflow: ['运营', '数据分析员', 'CEO'],
    documentName: '运营周报摘要.md',
    content: PRESET_CONTENTS['weekly-brief'],
    preview: buildPreview(PRESET_CONTENTS['weekly-brief']),
    charCount: PRESET_CONTENTS['weekly-brief'].length,
    sectionCount: PRESET_CONTENTS['weekly-brief'].split('\n').filter((l) => l.startsWith('## ')).length,
  },
];

export function getPresetById(id: string): PresetDoc | undefined {
  return PRESET_REGISTRY.find((p) => p.id === id);
}
