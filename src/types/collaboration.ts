export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate?: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  startDate?: number;
  dueDate?: number;
  dod?: string;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  mentions: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TeamWithMembers extends Team {
  members: Array<{
    userId: string;
    userName?: string;
    userAvatar?: string;
    role: string;
  }>;
}

export interface ProjectWithDetails extends Project {
  tasks: Task[];
  pages: Array<{ id: string; title: string }>;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  title?: string;
  functions: string[];
  bio?: string;
  updatedAt: number;
}

export interface UserTaskSummary {
  projectId: string;
  projectName: string;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
}

export interface AIAnalysisResult {
  tasks: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    suggestedAssigneeFunction: string;
    subtasks?: { title: string; description: string }[];
    estimatedDays: number;
  }[];
  review: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    riskPoints: string[];
  };
  workflow: {
    phase: string;
    description: string;
    tasks: string[];
    assigneeFunction: string;
    order: number;
    estimatedDays: number;
  }[];
}

export interface WorkflowAnalysis {
  id: string;
  projectId: string | null;
  documentName: string;
  documentSummary: string | null;
  workflowRoles: string[];
  roleFlow: {
    title: string;
    stages: {
      role: string;
      stageGoal: string;
      handoffToNext: string;
      stageInput?: string;
      watchPoints: string[];
      stageOutput?: string;
    }[];
  } | null;
  taskSchedule: {
    step: number;
    owner: string;
    goal: string;
    inputFrom: string[];
    output: string;
    priority: 'high' | 'medium' | 'low';
  }[] | null;
  createdAt: number;
  createdBy: string;
}

export interface WorkflowTaskLink {
  id: string;
  analysisId: string;
  taskId: string | null;
  stepNumber: number;
  role: string;
  goal: string;
}
