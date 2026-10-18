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
  const input = 'mt-1 block w-full rounded-lg border border-line bg-page px-3.5 py-2 text-sm text-content placeholder-content-tertiary outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 transition-all';
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="account-title" onKeyDown={e => { if (e.key === 'Escape' && !busy) onClose(); }}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs" onClick={() => { if (!busy) onClose(); }} />
      <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-2xl border border-line bg-white text-left text-content shadow-modal dark:border-zinc-800 dark:bg-[#1a1c20] dark:text-zinc-100 animate-scale-in overflow-hidden">
        <header className="flex items-center justify-between border-b border-line-subtle px-6 py-4 dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40">
          <div>
            <h2 id="account-title" className="text-base font-semibold text-content dark:text-zinc-100">账号与偏好中心</h2>
            <p className="text-xs text-content-tertiary dark:text-zinc-400 mt-0.5">{user.email} · {user.provider === 'demo' ? '公共演示账号' : user.hasPassword ? '邮箱密码登录' : '第三方授权登录'}</p>
          </div>
          <button
            autoFocus
            aria-label="关闭账号中心"
            disabled={busy}
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </header>
        <div className="space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-content dark:text-zinc-200">使用工作模式</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['personal', 'enterprise'] as const).map(mode => (
                <button
                  key={mode}
                  aria-pressed={user.mode === mode}
                  disabled={busy}
                  onClick={() => void perform(() => changeMode(mode), `已切换至${mode === 'personal' ? '个人' : '企业'}模式`)}
                  className={`rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                    user.mode === mode
                      ? 'border-brand bg-brand-light dark:bg-blue-950/40 text-brand ring-1 ring-brand/30 shadow-xs'
                      : 'border-line bg-white hover:border-brand/40 dark:border-zinc-700/80 dark:bg-zinc-800/80 text-content dark:text-zinc-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                    user.mode === mode ? 'bg-brand text-white shadow-xs' : 'bg-surface-hover text-content-secondary dark:bg-zinc-700'
                  }`}>
                    {mode === 'personal' ? <User size={18} /> : <Building2 size={18} />}
                  </div>
                  <strong className="block text-sm font-semibold">{mode === 'personal' ? '个人模式' : '企业模式'}</strong>
                  <span className="mt-1 block text-xs text-content-tertiary dark:text-zinc-400 leading-normal">
                    {mode === 'personal' ? '专注个人知识库、文档与原生 AI' : '团队协作、项目看板与角色工作流'}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-content-tertiary dark:text-zinc-500">
              切换工作模式会完整保留所有画布文档、团队项目与历史记录。企业模式内的操作权限由成员分配角色确定。
            </p>
            {enterprise && (
              <Link href="/teams" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                进入团队与企业协作空间 →
              </Link>
            )}
          </section>

          <form
            className="space-y-3.5 pt-4 border-t border-line-subtle dark:border-zinc-800"
            onSubmit={e => {
              e.preventDefault();
              void perform(async () => {
                const res = await fetch('/api/user/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...draft, ...(enterprise ? { functions: functionsText.split(/[,，]/).map(value => value.trim()).filter(Boolean) } : {}) })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '保存失败');
                updateName(draft.displayName.trim());
              }, '个人资料已保存');
            }}
          >
            <h3 className="text-sm font-semibold text-content dark:text-zinc-200">个人资料设置</h3>
            <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
              展示昵称
              <input required maxLength={60} className={input} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} />
            </label>
            <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
              个人简介
              <textarea maxLength={1000} rows={2} className={`${input} resize-none`} value={draft.bio} onChange={e => setDraft({ ...draft, bio: e.target.value })} />
            </label>
            {enterprise && (
              <>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
                  职务头衔
                  <input maxLength={80} className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
                </label>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
                  专业职能（逗号分隔，如：前端开发, 架构师）
                  <input className={input} value={functionsText} onChange={e => setFunctionsText(e.target.value)} />
                </label>
                <p className="text-xs text-content-tertiary">AI 助手会根据已保存的职务和职能自动适配专业视角。职能标签也会展示在团队成员列表中，权限以实际分配角色为准。</p>
              </>
            )}
            <button disabled={busy || !loaded} className="rounded-lg bg-brand hover:bg-brand-hover active:bg-brand-active px-4 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors shadow-xs">
              保存个人资料
            </button>
          </form>

          <section className="space-y-3.5 pt-4 border-t border-line-subtle dark:border-zinc-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-content dark:text-zinc-200">
              <Shield size={16} className="text-brand" />
              账号安全
            </h3>
            {user.hasPassword ? (
              <form
                className="space-y-3"
                onSubmit={e => {
                  e.preventDefault();
                  void perform(async () => {
                    if (newPassword !== confirmPassword) throw new Error('两次输入的新密码不一致');
                    const res = await fetch('/api/account/password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ currentPassword, newPassword })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || '修改失败');
                    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                  }, '密码已修改，其他设备的密码登录会话已失效');
                }}
              >
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
                  当前密码
                  <input required className={input} type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </label>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
                  新密码
                  <input required minLength={10} className={input} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </label>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300">
                  确认新密码
                  <input required minLength={10} className={input} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </label>
                <p className="text-xs text-content-tertiary">密码需至少 10 个字符。修改成功后，其他设备的登录凭证将自动失效。</p>
                <button disabled={busy} className="rounded-lg border border-line hover:bg-surface-hover px-4 py-2 text-xs font-medium text-content dark:border-zinc-700 dark:text-zinc-200 transition-colors">
                  修改登录密码
                </button>
              </form>
            ) : (
              <p className="text-xs text-content-tertiary">
                {user.provider === 'demo' ? '公共演示账号不提供独立密码设置，如需长期保存私人知识库请注册正式账号。' : '密码由对应第三方登录平台统一管理。'}
              </p>
            )}
          </section>

          {enterprise && <EnterpriseTasks />}

          <div className="pt-4 border-t border-line-subtle dark:border-zinc-800">
            <button disabled={busy} onClick={() => void perform(logout)} className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
              <LogOut size={16} />
              退出当前账号
            </button>
          </div>

          {error && <p role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600 dark:bg-red-950/30 dark:border-red-900/40">{error}</p>}
          {message && <p role="status" className="p-3 rounded-lg border border-emerald-200 bg-[#e8f8f0] text-xs text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/40">{message}</p>}
        </div>
      </div>
    </div>
  );
}
