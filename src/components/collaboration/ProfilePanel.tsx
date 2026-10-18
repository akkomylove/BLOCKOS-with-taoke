'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { X, User, Building2, Shield, LogOut } from 'lucide-react';
import { useAccountStore } from '@/store/accountStore';
import type { AccountMode } from '@/types/account';

const EnterpriseTasks = dynamic(() => import('./EnterpriseAccountTasks'), { ssr: false });
const empty = { displayName: '', bio: '', title: '', functions: [] as string[] };
export function ProfilePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, switchMode, logout, updateName } = useAccountStore();
  const [draft, setDraft] = useState(empty);
  const [functionsText, setFunctionsText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoaded(false); setError(''); setMessage(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    fetch('/api/user/profile', { signal: controller.signal }).then(async res => { if (!res.ok) throw new Error('资料加载失败，请关闭后重试'); return res.json(); }).then(data => { setDraft(data); setFunctionsText(data.functions.join(', ')); setLoaded(true); }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [isOpen, user?.id]);
  if (!isOpen || !user) return null;
  const enterprise = user.mode === 'enterprise';
  async function perform(action: () => Promise<void>, success = '') {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); }
    catch (err) { setError(err instanceof Error ? err.message : '操作失败，请重试'); }
    finally { setBusy(false); }
  }
  async function changeMode(mode: AccountMode) { await switchMode(mode); }
  const input = 'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800';
  return <div className="fixed inset-0 z-[250] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="account-title" onKeyDown={e => { if (e.key === 'Escape' && !busy) onClose(); }}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!busy) onClose(); }} />
    <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white text-left text-gray-900 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <header className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-zinc-700"><div><h2 id="account-title" className="text-lg font-semibold">账号中心</h2><p className="text-xs text-gray-500">{user.email} · {user.provider === 'demo' ? '演示账号' : user.hasPassword ? '邮箱账号' : '第三方账号'}</p></div><button autoFocus aria-label="关闭账号中心" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      <div className="space-y-6 overflow-y-auto p-5">
        <section><h3 className="mb-3 font-medium">使用模式</h3><div className="grid grid-cols-2 gap-3">{(['personal', 'enterprise'] as const).map(mode => <button key={mode} aria-pressed={user.mode === mode} disabled={busy} onClick={() => void perform(() => changeMode(mode), `已切换至${mode === 'personal' ? '个人' : '企业'}模式`)} className={`rounded-xl border p-4 text-left disabled:opacity-60 ${user.mode === mode ? 'border-blue-500 bg-blue-500/5' : 'border-gray-200 dark:border-zinc-700'}`}>{mode === 'personal' ? <User size={20} /> : <Building2 size={20} />}<strong className="mt-2 block text-sm">{mode === 'personal' ? '个人模式' : '企业模式'}</strong><span className="mt-1 block text-xs text-gray-500">{mode === 'personal' ? '专注知识、文档与 AI' : '团队、项目与成员协作'}</span></button>)}</div><p className="mt-2 text-xs text-gray-500">切换会保留文档、团队和项目。企业模式内的操作权限由成员角色决定。</p>{enterprise && <Link href="/teams" className="mt-3 inline-block text-sm text-blue-500">进入企业协作 →</Link>}</section>
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); void perform(async () => {
          const res = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, ...(enterprise ? { functions: functionsText.split(/[,，]/).map(value => value.trim()).filter(Boolean) } : {}) }) });
          const data = await res.json(); if (!res.ok) throw new Error(data.error || '保存失败');
          updateName(draft.displayName.trim());
        }, '个人资料已保存'); }}><h3 className="font-medium">个人资料</h3><label className="block text-sm">昵称<input required maxLength={60} className={input} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} /></label><label className="block text-sm">个人简介<textarea maxLength={1000} className={input} value={draft.bio} onChange={e => setDraft({ ...draft, bio: e.target.value })} /></label>{enterprise && <><label className="block text-sm">职务<input maxLength={80} className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><label className="block text-sm">职能（逗号分隔）<input className={input} value={functionsText} onChange={e => setFunctionsText(e.target.value)} /></label><p className="text-xs text-gray-500">成员权限以具体团队和项目中的角色为准。</p></>}<button disabled={busy || !loaded} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">保存资料</button></form>
        <section className="space-y-3"><h3 className="flex items-center gap-2 font-medium"><Shield size={16} />账号安全</h3>{user.hasPassword ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void perform(async () => {
          if (newPassword !== confirmPassword) throw new Error('两次输入的新密码不一致');
          const res = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
          const data = await res.json(); if (!res.ok) throw new Error(data.error || '修改失败');
          setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        }, '密码已修改，其他设备的密码登录会话已失效'); }}><label className="block text-sm">当前密码<input required className={input} type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label><label className="block text-sm">新密码<input required minLength={10} className={input} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label><label className="block text-sm">确认新密码<input required minLength={10} className={input} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label><p className="text-xs text-gray-500">至少 10 个字符，不超过 72 字节。修改后其他设备需要重新登录。</p><button disabled={busy} className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-zinc-700">修改密码</button></form> : <p className="text-sm text-gray-500">{user.provider === 'demo' ? '公共演示账号不提供密码设置，请注册正式账号保存私人内容。' : '密码由原登录平台管理。'}</p>}</section>
        {enterprise && <EnterpriseTasks />}
        <button disabled={busy} onClick={() => void perform(logout)} className="flex items-center gap-2 text-sm text-red-500"><LogOut size={16} />退出登录</button>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}{message && <p role="status" className="text-sm text-green-600">{message}</p>}
      </div>
    </div>
  </div>;
}
