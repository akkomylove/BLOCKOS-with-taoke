import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Team, Project, Milestone, Task } from '@/types/collaboration';

interface CollaborationState {
  teams: Team[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  currentTeamId: string | null;
  currentProjectId: string | null;
  loading: boolean;
  _mutations: {
    teams: { loading: boolean; error: string | null };
    projects: { loading: boolean; error: string | null };
    milestones: { loading: boolean; error: string | null };
    tasks: { loading: boolean; error: string | null };
  };

  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string, avatar?: string) => Promise<string>;
  updateTeam: (id: string, updates: Partial<Omit<Team, 'id' | 'createdAt' | 'ownerId'>>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  fetchProjects: (teamId: string) => Promise<void>;
  createProject: (teamId: string, name: string, description?: string, icon?: string, color?: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'teamId' | 'createdAt' | 'ownerId'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;

  fetchMilestones: (projectId: string) => Promise<void>;
  createMilestone: (projectId: string, name: string, description?: string, dueDate?: number, status?: 'pending' | 'in_progress' | 'completed') => Promise<string>;
  updateMilestone: (id: string, updates: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;

  fetchTasks: (projectId: string, parentId?: string) => Promise<void>;
  createTask: (projectId: string, title: string, parentId?: string, description?: string, status?: 'todo' | 'in_progress' | 'done', priority?: 'low' | 'medium' | 'high' | 'urgent', assigneeId?: string, dueDate?: number, dod?: string, orderIndex?: number) => Promise<string>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    immer((set, get) => ({
      teams: [],
      projects: [],
      milestones: [],
      tasks: [],
      currentTeamId: null,
      currentProjectId: null,
      loading: false,
      _mutations: {
        teams: { loading: false, error: null },
        projects: { loading: false, error: null },
        milestones: { loading: false, error: null },
        tasks: { loading: false, error: null },
      },

      fetchTeams: async () => {
        try {
          const res = await fetch('/api/teams');
          if (!res.ok) throw new Error('Failed to fetch teams');
          const data = await res.json();
          set((state) => {
            state.teams = data.teams || [];
          });
        } catch (err) {
          console.error('fetchTeams error:', err);
        }
      },

      createTeam: async (name: string, description?: string, avatar?: string) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimisticTeam: Team = {
          id: tempId,
          name,
          description,
          avatar,
          ownerId: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => {
          state.teams.push(optimisticTeam);
          state._mutations.teams.loading = true;
          state._mutations.teams.error = null;
        });
        try {
          const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, avatar }),
          });
          if (!res.ok) throw new Error('Failed to create team');
          const { id } = await res.json();
          set((state) => {
            const index = state.teams.findIndex((t) => t.id === tempId);
            if (index !== -1) {
              state.teams[index] = { ...state.teams[index], id };
            }
            state._mutations.teams.loading = false;
          });
          return id;
        } catch (err) {
          set((state) => {
            state.teams = state.teams.filter((t) => t.id !== tempId);
            state._mutations.teams.loading = false;
            state._mutations.teams.error = (err as Error).message;
          });
          throw err;
        }
      },

      updateTeam: async (id: string, updates: Partial<Omit<Team, 'id' | 'createdAt' | 'ownerId'>>) => {
        const originalTeam = get().teams.find((t) => t.id === id);
        set((state) => {
          const team = state.teams.find((t) => t.id === id);
          if (team) {
            Object.assign(team, updates);
          }
          state._mutations.teams.loading = true;
          state._mutations.teams.error = null;
        });
        try {
          const res = await fetch(`/api/teams/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!res.ok) throw new Error('Failed to update team');
          set((state) => {
            state._mutations.teams.loading = false;
          });
        } catch (err) {
          if (originalTeam) {
            set((state) => {
              const team = state.teams.find((t) => t.id === id);
              if (team) {
                Object.assign(team, originalTeam);
              }
              state._mutations.teams.loading = false;
              state._mutations.teams.error = (err as Error).message;
            });
          }
          throw err;
        }
      },

      deleteTeam: async (id: string) => {
        const originalTeams = [...get().teams];
        set((state) => {
          state.teams = state.teams.filter((t) => t.id !== id);
          state._mutations.teams.loading = true;
          state._mutations.teams.error = null;
        });
        try {
          const res = await fetch(`/api/teams/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete team');
          set((state) => {
            state._mutations.teams.loading = false;
          });
        } catch (err) {
          set((state) => {
            state.teams = originalTeams;
            state._mutations.teams.loading = false;
            state._mutations.teams.error = (err as Error).message;
          });
          throw err;
        }
      },

      fetchProjects: async (teamId: string) => {
        try {
          const res = await fetch(`/api/projects?teamId=${teamId}`);
          if (!res.ok) throw new Error('Failed to fetch projects');
          const data = await res.json();
          set((state) => {
            state.projects = data.projects || [];
            state.currentTeamId = teamId;
          });
        } catch (err) {
          console.error('fetchProjects error:', err);
        }
      },

      createProject: async (teamId: string, name: string, description?: string, icon?: string, color?: string) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimisticProject: Project = {
          id: tempId,
          teamId,
          name,
          description,
          icon,
          color,
          ownerId: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => {
          state.projects.push(optimisticProject);
          state._mutations.projects.loading = true;
          state._mutations.projects.error = null;
        });
        try {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId, name, description, icon, color }),
          });
          if (!res.ok) throw new Error('Failed to create project');
          const { id } = await res.json();
          set((state) => {
            const index = state.projects.findIndex((p) => p.id === tempId);
            if (index !== -1) {
              state.projects[index] = { ...state.projects[index], id };
            }
            state._mutations.projects.loading = false;
          });
          return id;
        } catch (err) {
          set((state) => {
            state.projects = state.projects.filter((p) => p.id !== tempId);
            state._mutations.projects.loading = false;
            state._mutations.projects.error = (err as Error).message;
          });
          throw err;
        }
      },

      updateProject: async (id: string, updates: Partial<Omit<Project, 'id' | 'teamId' | 'createdAt' | 'ownerId'>>) => {
        const originalProject = get().projects.find((p) => p.id === id);
        set((state) => {
          const project = state.projects.find((p) => p.id === id);
          if (project) {
            Object.assign(project, updates);
          }
          state._mutations.projects.loading = true;
          state._mutations.projects.error = null;
        });
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!res.ok) throw new Error('Failed to update project');
          set((state) => {
            state._mutations.projects.loading = false;
          });
        } catch (err) {
          if (originalProject) {
            set((state) => {
              const project = state.projects.find((p) => p.id === id);
              if (project) {
                Object.assign(project, originalProject);
              }
              state._mutations.projects.loading = false;
              state._mutations.projects.error = (err as Error).message;
            });
          }
          throw err;
        }
      },

      deleteProject: async (id: string) => {
        const originalProjects = [...get().projects];
        set((state) => {
          state.projects = state.projects.filter((p) => p.id !== id);
          state._mutations.projects.loading = true;
          state._mutations.projects.error = null;
        });
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete project');
          set((state) => {
            state._mutations.projects.loading = false;
          });
        } catch (err) {
          set((state) => {
            state.projects = originalProjects;
            state._mutations.projects.loading = false;
            state._mutations.projects.error = (err as Error).message;
          });
          throw err;
        }
      },

      setCurrentProject: (id: string | null) => {
        set((state) => {
          state.currentProjectId = id;
        });
      },

      fetchMilestones: async (projectId: string) => {
        try {
          const res = await fetch(`/api/milestones?projectId=${projectId}`);
          if (!res.ok) throw new Error('Failed to fetch milestones');
          const data = await res.json();
          set((state) => {
            state.milestones = data.milestones || [];
          });
        } catch (err) {
          console.error('fetchMilestones error:', err);
        }
      },

      createMilestone: async (projectId: string, name: string, description?: string, dueDate?: number, status?: 'pending' | 'in_progress' | 'completed') => {
        set((state) => {
          state._mutations.milestones.loading = true;
          state._mutations.milestones.error = null;
        });
        try {
          const res = await fetch('/api/milestones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, name, description, dueDate, status }),
          });
          if (!res.ok) throw new Error('Failed to create milestone');
          const { id } = await res.json();
          set((state) => {
            state._mutations.milestones.loading = false;
          });
          await get().fetchMilestones(projectId);
          return id;
        } catch (err) {
          set((state) => {
            state._mutations.milestones.loading = false;
            state._mutations.milestones.error = (err as Error).message;
          });
          throw err;
        }
      },

      updateMilestone: async (id: string, updates: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt'>>) => {
        set((state) => {
          state._mutations.milestones.loading = true;
          state._mutations.milestones.error = null;
        });
        try {
          const res = await fetch(`/api/milestones/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!res.ok) throw new Error('Failed to update milestone');
          set((state) => {
            state._mutations.milestones.loading = false;
          });
          const { currentProjectId } = get();
          if (currentProjectId) {
            await get().fetchMilestones(currentProjectId);
          }
        } catch (err) {
          set((state) => {
            state._mutations.milestones.loading = false;
            state._mutations.milestones.error = (err as Error).message;
          });
          throw err;
        }
      },

      deleteMilestone: async (id: string) => {
        set((state) => {
          state._mutations.milestones.loading = true;
          state._mutations.milestones.error = null;
        });
        try {
          const res = await fetch(`/api/milestones/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete milestone');
          set((state) => {
            state._mutations.milestones.loading = false;
          });
          const { currentProjectId } = get();
          if (currentProjectId) {
            await get().fetchMilestones(currentProjectId);
          }
        } catch (err) {
          set((state) => {
            state._mutations.milestones.loading = false;
            state._mutations.milestones.error = (err as Error).message;
          });
          throw err;
        }
      },

      fetchTasks: async (projectId: string, parentId?: string) => {
        try {
          const url = parentId 
            ? `/api/tasks?projectId=${projectId}&parentId=${parentId}`
            : `/api/tasks?projectId=${projectId}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch tasks');
          const data = await res.json();
          set((state) => {
            state.tasks = data.tasks || [];
          });
        } catch (err) {
          console.error('fetchTasks error:', err);
        }
      },

      createTask: async (projectId: string, title: string, parentId?: string, description?: string, status?: 'todo' | 'in_progress' | 'done', priority?: 'low' | 'medium' | 'high' | 'urgent', assigneeId?: string, dueDate?: number, dod?: string, orderIndex?: number) => {
        set((state) => {
          state._mutations.tasks.loading = true;
          state._mutations.tasks.error = null;
        });
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, parentId, title, description, status, priority, assigneeId, dueDate, dod, orderIndex }),
          });
          if (!res.ok) throw new Error('Failed to create task');
          const { id } = await res.json();
          set((state) => {
            state._mutations.tasks.loading = false;
          });
          await get().fetchTasks(projectId);
          return id;
        } catch (err) {
          set((state) => {
            state._mutations.tasks.loading = false;
            state._mutations.tasks.error = (err as Error).message;
          });
          throw err;
        }
      },

      updateTask: async (id: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => {
        set((state) => {
          state._mutations.tasks.loading = true;
          state._mutations.tasks.error = null;
        });
        try {
          const res = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!res.ok) throw new Error('Failed to update task');
          set((state) => {
            state._mutations.tasks.loading = false;
          });
          const { currentProjectId } = get();
          if (currentProjectId) {
            await get().fetchTasks(currentProjectId);
          }
        } catch (err) {
          set((state) => {
            state._mutations.tasks.loading = false;
            state._mutations.tasks.error = (err as Error).message;
          });
          throw err;
        }
      },

      deleteTask: async (id: string) => {
        set((state) => {
          state._mutations.tasks.loading = true;
          state._mutations.tasks.error = null;
        });
        try {
          const res = await fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete task');
          set((state) => {
            state._mutations.tasks.loading = false;
          });
          const { currentProjectId } = get();
          if (currentProjectId) {
            await get().fetchTasks(currentProjectId);
          }
        } catch (err) {
          set((state) => {
            state._mutations.tasks.loading = false;
            state._mutations.tasks.error = (err as Error).message;
          });
          throw err;
        }
      },
    })),
    {
      name: 'blockos-collaboration-storage',
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentTeamId: state.currentTeamId,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
