export interface DemoUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'employee';
  title: string;
  functions: string[];
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-admin-001',
    name: '陈明远',
    email: 'admin@circlelight.com',
    avatar: '',
    role: 'admin',
    title: '产品经理',
    functions: ['产品规划', '需求分析', '项目管理'],
  },
  {
    id: 'demo-emp-001',
    name: '林小薇',
    email: 'linxiaowei@circlelight.com',
    avatar: '',
    role: 'employee',
    title: '前端开发',
    functions: ['前端开发', 'React', 'TypeScript'],
  },
  {
    id: 'demo-emp-002',
    name: '张浩然',
    email: 'zhanghaoran@circlelight.com',
    avatar: '',
    role: 'employee',
    title: '后端开发',
    functions: ['后端开发', 'Node.js', '数据库设计'],
  },
  {
    id: 'demo-emp-003',
    name: '苏婉清',
    email: 'suwanqing@circlelight.com',
    avatar: '',
    role: 'employee',
    title: 'UI 设计师',
    functions: ['UI设计', '交互设计', 'Figma'],
  },
  {
    id: 'demo-emp-004',
    name: '王志强',
    email: 'wangzhiqiang@circlelight.com',
    avatar: '',
    role: 'employee',
    title: '测试工程师',
    functions: ['测试工程', '自动化测试', '性能测试'],
  },
];

export const DEMO_ADMIN = DEMO_USERS[0];
export const DEMO_EMPLOYEES = DEMO_USERS.slice(1);

export function isDemoAdmin(userId: string): boolean {
  return userId === DEMO_ADMIN.id;
}

export function getDemoUser(userId: string): DemoUser | undefined {
  return DEMO_USERS.find(u => u.id === userId);
}