'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAccountStore } from '@/store/accountStore';

const AccountPanel = dynamic(() => import('./collaboration/ProfilePanel').then(module => module.ProfilePanel), { ssr: false });

export default function AccountGate({ children, enterprise = false }: { children: ReactNode; enterprise?: boolean }) {
  const { user, status, error, load } = useAccountStore();
  const [showAccount, setShowAccount] = useState(false);
  useEffect(() => { void load(); }, [load]);
  if (status === 'idle' || status === 'loading') return <div className="grid min-h-screen place-items-center">正在读取账号…</div>;
  if (status === 'error') return <div className="grid min-h-screen place-items-center"><div role="alert">{error}<button className="ml-4 text-blue-500" onClick={() => void load(true)}>重试</button></div></div>;
  if (!user) return <div className="grid min-h-screen place-items-center"><div className="space-y-4 text-center"><h1 className="text-xl">欢迎使用 BlockOS</h1><p>登录后开始你的个人知识工作，或开启企业协作。</p><Link className="inline-block rounded-lg bg-blue-600 px-5 py-3 text-white" href="/login">登录 / 注册</Link></div></div>;
  if (enterprise && user.mode !== 'enterprise') return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md space-y-5 text-center"><h1 className="text-2xl font-semibold">团队协作属于企业模式</h1><p>开启企业模式后，可使用团队、项目、成员管理和协作看板。已有数据会保留。</p><button onClick={() => setShowAccount(true)} className="rounded-lg bg-blue-600 px-5 py-3 text-white">打开账号中心</button><Link href="/" className="block text-blue-500">回到个人工作区</Link>{showAccount && <AccountPanel isOpen onClose={() => setShowAccount(false)} />}</div></div>;
  return children;
}
