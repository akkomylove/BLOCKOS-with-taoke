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
