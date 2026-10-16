export interface DocumentChapter {
  id: string;
  title: string;
  blockIds: string[];
}

export interface Page {
  id: string;
  title: string;
  icon?: string;
  folderId?: string;
  chapters?: DocumentChapter[];
  kind?: 'document' | 'inbox';
  version?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  collapsed: boolean;
  createdAt: number;
}
