'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Sparkles, User, Building2 } from 'lucide-react';
import { DEMO_USERS } from '@/lib/demo-users';
import type { AccountMode } from '@/types/account';

export default function LoginPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AccountMode>('personal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<{ demo: boolean; providers: string[] }>({ demo: false, providers: [] });
  useEffect(() => { fetch('/api/auth/options').then(res => res.ok ? res.json() : null).then(data => { if (data) setOptions(data); }).catch(() => {}); }, []);
  function destination() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
  }
  async function submit(route: string, body: object) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({ error: '服务暂时不可用，请稍后重试' }));
      if (!res.ok) throw new Error(data.error || '登录失败，请重试');
      window.location.assign(destination());
    } catch (err) { setError(err instanceof Error ? err.message : '网络连接失败，请重试'); setBusy(false); }
  }
  const input = 'w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  return <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 px-4 py-10 text-gray-900 dark:text-zinc-100">
    <div className="mx-auto max-w-md">
      <div className="mb-7 text-center"><Sparkles className="mx-auto mb-3 h-10 w-10 text-blue-500" /><h1 className="text-3xl font-semibold">BlockOS</h1><p className="mt-2 text-sm text-gray-500">一个账号，连接个人知识与企业协作</p></div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-zinc-800" role="tablist" aria-label="登录方式">
          {['登录', '注册'].map((label, index) => <button role="tab" aria-selected={register === !!index} key={label} disabled={busy} onClick={() => { setRegister(!!index); setError(''); setPassword(''); }} className={`rounded-lg py-2 text-sm ${register === !!index ? 'bg-white shadow-sm dark:bg-zinc-700' : 'text-gray-500'}`}>{label}</button>)}
        </div>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(`/api/auth/${register ? 'register' : 'login'}`, { email, password, ...(register ? { name, mode } : {}) }); }}>
          {register && <label className="block text-sm">昵称<input className={`${input} mt-1.5`} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" maxLength={60} required /></label>}
          <label className="block text-sm">邮箱<input className={`${input} mt-1.5`} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} required /></label>
          <label className="block text-sm">密码<input className={`${input} mt-1.5`} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : undefined} required /></label>
          {register && <><p className="text-xs text-gray-500">密码至少 10 个字符，不超过 72 字节。</p><fieldset><legend className="mb-2 text-sm">选择使用模式</legend><div className="grid grid-cols-2 gap-2">{(['personal', 'enterprise'] as const).map(value => <label key={value} className={`cursor-pointer rounded-xl border p-3 text-sm ${mode === value ? 'border-blue-500 bg-blue-500/5' : 'border-gray-200 dark:border-zinc-700'}`}><input className="mr-2" type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} />{value === 'personal' ? <User className="mb-2 mt-2 h-5 w-5" /> : <Building2 className="mb-2 mt-2 h-5 w-5" />}<strong>{value === 'personal' ? '个人模式' : '企业模式'}</strong><small className="mt-1 block text-gray-500">{value === 'personal' ? '文档、AI、个人记录' : '团队、项目、成员协作'}</small></label>)}</div><p className="mt-2 text-xs text-gray-500">之后可在账号中心切换，已有内容会保留。</p></fieldset></>}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50" disabled={busy}>{busy ? '正在处理…' : register ? '创建账号' : '登录'}</button>
        </form>
        {options.providers.length > 0 && <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 dark:border-zinc-700">{options.providers.map(provider => <button disabled={busy} key={provider} className={`${input} hover:border-blue-500`} onClick={() => { setBusy(true); void signIn(provider, { callbackUrl: destination() }); }}>使用 {provider === 'github' ? 'GitHub' : 'Google'} 登录</button>)}</div>}
      </div>
      {options.demo && <details className="mt-5 rounded-xl border border-gray-200 p-4 text-sm dark:border-zinc-800"><summary className="cursor-pointer text-gray-500">体验企业演示账号</summary><p className="my-3 text-xs text-gray-500">演示账号为公共体验数据，请勿用于私人内容。</p><div className="grid grid-cols-2 gap-2">{DEMO_USERS.map(user => <button disabled={busy} className="rounded-lg border border-gray-200 p-2 dark:border-zinc-700" key={user.id} onClick={() => void submit('/api/auth/simple-login', { userId: user.id })}>{user.name} · {user.role === 'admin' ? '管理者' : '成员'}</button>)}</div></details>}
    </div>
  </main>;
}
