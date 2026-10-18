export type AccountMode = 'personal' | 'enterprise';

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: string;
  mode: AccountMode;
  role: string;
  isAdmin: boolean;
  hasPassword: boolean;
}
