export interface Page {
  id: string;
  title: string;
  icon?: string;
  folderId?: string;
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
