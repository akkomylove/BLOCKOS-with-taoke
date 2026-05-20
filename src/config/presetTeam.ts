export interface PresetTeamMember {
  id: string;
  name: string;
  role: '产品经理' | 'UI设计师' | '前端开发' | '后端开发' | '测试工程师';
  avatar?: string;
  title: string;
  functions: string[];
}

export const PRESET_TEAM = {
  id: 'preset-team-circlelight',
  name: 'CircleLight 研发团队',
  description: '电商平台项目研发团队',
  members: [
    {
      id: 'member-pm',
      name: '陈明远',
      role: '产品经理' as const,
      avatar: '👔',
      title: '产品经理',
      functions: ['需求分析', 'PRD 撰写', '项目管理', '用户研究'],
    },
    {
      id: 'member-ui',
      name: '苏婉清',
      role: 'UI设计师' as const,
      avatar: '🎨',
      title: 'UI 设计师',
      functions: ['视觉设计', '交互设计', '原型制作', '设计规范'],
    },
    {
      id: 'member-fe',
      name: '林小薇',
      role: '前端开发' as const,
      avatar: '💻',
      title: '前端开发工程师',
      functions: ['React 开发', '组件封装', '性能优化', '响应式适配'],
    },
    {
      id: 'member-be',
      name: '张浩然',
      role: '后端开发' as const,
      avatar: '⚙️',
      title: '后端开发工程师',
      functions: ['API 开发', '数据库设计', '微服务', '系统架构'],
    },
    {
      id: 'member-qa',
      name: '王志强',
      role: '测试工程师' as const,
      avatar: '🧪',
      title: '测试工程师',
      functions: ['功能测试', '自动化测试', '性能测试', '缺陷管理'],
    },
  ] as PresetTeamMember[],
};

export const WORKFLOW_ROLES = PRESET_TEAM.members.map(m => m.role);
