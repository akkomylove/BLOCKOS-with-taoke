'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import {
  ArrowRight, Building2, Check, ChevronDown, Eye, EyeOff, FileText,
  LayoutGrid, Loader2, LockKeyhole, Mail, Plus, Sparkles, User,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { DEMO_USERS } from '@/lib/demo-users';
import type { AccountMode } from '@/types/account';
import styles from './login.module.css';

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function ProductPreview() {
  return <div className={styles.preview} aria-hidden="true">
    <div className={styles.workspace}>
      <div className={styles.workspaceBar}>
        <span className={styles.windowDots}><i /><i /><i /></span>
        <span>我的工作台</span><LayoutGrid size={13} />
      </div>
      <div className={styles.workspaceBody}>
        <div className={styles.previewSidebar}>
          <span className={styles.sidebarLabel}>我的空间</span>
          <span className={styles.activePreviewItem}><FileText size={12} />我的文档</span>
          <span><LayoutGrid size={12} />随手记录</span>
          <span><Sparkles size={12} />AI 助手</span>
          <div className={styles.sidebarRule} />
          <span className={styles.sidebarLabel}>收藏</span>
          <span><span className={styles.tinyDot} />灵感收集</span>
          <span><span className={styles.tinyDot} />本周计划</span>
        </div>
        <div className={styles.previewDocument}>
          <span className={styles.documentEyebrow}>MY NEXT CHAPTER</span>
          <h3>把灵感，变成下一步</h3>
          <p>每一个值得记录的想法，都有生长的空间。</p>
          <div className={styles.previewLines}><i /><i /><i /></div>
          <div className={styles.previewTask}><span><Check size={10} /></span>整理今天的新想法</div>
          <div className={styles.previewTask}><span />开始下一段创作</div>
        </div>
      </div>
    </div>
    <div className={styles.noteCard}><span className={styles.noteIcon}><FileText size={17} /></span><div><strong>一份笔记，无限可能</strong><span>文字 · 卡片 · 你的灵感</span></div></div>
    <div className={styles.smartCard}><div className={styles.smartHeading}><span><Sparkles size={15} /></span><strong>有 AI，想法更进一步</strong></div><p>梳理思路、连接知识，<br />把时间留给真正重要的事。</p><div className={styles.smartLines}><i /><i /></div></div>
    <span className={styles.floatingPlus}><Plus size={20} /></span>
  </div>;
}

export default function LoginPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AccountMode>('personal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<{ demo: boolean; providers: string[] }>({ demo: false, providers: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/options', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setOptions(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function destination() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
  }

  function changeForm(next: boolean) {
    setRegister(next);
    setError('');
    setPassword('');
    setShowPassword(false);
  }

  async function submit(route: string, body: object) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({ error: '服务暂时不可用，请稍后重试' }));
      if (!res.ok) throw new Error(data.error || '登录失败，请重试');
      window.location.assign(destination());
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络连接失败，请重试');
      setBusy(false);
    }
  }

  async function providerLogin(provider: string) {
    setBusy(true);
    setError('');
    try { await signIn(provider, { callbackUrl: destination() }); }
    catch { setError('暂时无法连接登录平台，请稍后重试'); setBusy(false); }
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="BlockOS 首页"><Logo size={36} /><span>BlockOS</span><span className={styles.brandCaption}>AI 原生知识工作台</span></Link>
      <Link href="/" className={styles.backLink}>返回工作台<ArrowRight size={14} /></Link>
    </header>

    <div className={styles.main}>
      <aside className={styles.brandSide} aria-label="认识 BlockOS">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span />为每一个好想法，留一个位置</span>
          <h1>让想法成形，<br />让工作发生<span>。</span></h1>
          <p>记录、思考、创造，与 AI 一起。<br />从一个人的灵感，到一群人的共创。</p>
        </div>
        <ProductPreview />
        <div className={styles.brandBottom}><span><User size={14} />个人专注</span><i /><span><Building2 size={14} />企业协同</span><span className={styles.brandBottomNote}>在你的节奏里，找到更多可能</span></div>
      </aside>

      <section className={styles.formSide} aria-labelledby="login-heading">
        <div className={styles.formContainer}>
          <div className={styles.formHeading}><div className={styles.welcomeMark}><Logo size={30} /></div><h2 id="login-heading">{register ? '开启你的 BlockOS' : '欢迎回来'}</h2><p>{register ? '一个账号，开始个人创作与团队协作。' : '登录 BlockOS，继续你的思考与创造。'}</p></div>

          <div className={styles.tabs} role="tablist" aria-label="登录方式">
            <button type="button" role="tab" id="login-tab" aria-selected={!register} aria-controls="account-form" disabled={busy} className={!register ? styles.activeTab : undefined} onClick={() => changeForm(false)}>账号登录</button>
            <button type="button" role="tab" id="register-tab" aria-selected={register} aria-controls="account-form" disabled={busy} className={register ? styles.activeTab : undefined} onClick={() => changeForm(true)}>注册账号</button>
          </div>

          <form id="account-form" role="tabpanel" aria-labelledby={register ? 'register-tab' : 'login-tab'} onSubmit={event => { event.preventDefault(); void submit(`/api/auth/${register ? 'register' : 'login'}`, { email, password, ...(register ? { name, mode } : {}) }); }}>
            <fieldset className={styles.fields} disabled={busy}>
              {register && <div className={styles.field}><label htmlFor="account-name">怎么称呼你</label><div className={styles.inputWrap}><User size={17} /><input id="account-name" value={name} onChange={event => setName(event.target.value)} placeholder="输入你的昵称" autoComplete="nickname" maxLength={60} required /></div></div>}
              <div className={styles.field}><label htmlFor="account-email">邮箱</label><div className={styles.inputWrap}><Mail size={17} /><input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="请输入邮箱地址" autoComplete={register ? 'email' : 'username'} maxLength={254} required /></div></div>
              <div className={styles.field}><label htmlFor="account-password">密码</label><div className={styles.inputWrap}><LockKeyhole size={17} /><input id="account-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={register ? '设置登录密码' : '请输入密码'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : undefined} aria-describedby={register ? 'password-hint' : undefined} required /><button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{register && <small id="password-hint" className={styles.hint}>至少 10 个字符，不超过 72 字节。</small>}</div>

              {register && <fieldset className={styles.modeFieldset}><legend>选择适合你的工作方式</legend><div className={styles.modeOptions}>{(['personal', 'enterprise'] as const).map(value => <label key={value} className={styles.modeCard} data-selected={mode === value}><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} /><span className={styles.modeHeading}>{value === 'personal' ? <User size={17} /> : <Building2 size={17} />}<strong>{value === 'personal' ? '个人模式' : '企业模式'}</strong><span className={styles.radioMark}>{mode === value && <Check size={10} />}</span></span><small>{value === 'personal' ? '知识、笔记与 AI 创作' : '团队、项目与成员协作'}</small></label>)}</div><p className={styles.hint}>以后也能随时切换，已有内容会保留。</p></fieldset>}

              {error && <p role="alert" className={styles.error}>{error}</p>}
              <button type="submit" className={styles.submit} disabled={busy}>{busy ? <><Loader2 size={17} className={styles.spinner} />正在处理</> : <>{register ? '创建账号' : '登录'}<ArrowRight size={17} /></>}</button>
            </fieldset>
          </form>

          {options.providers.length > 0 && <div className={styles.otherLogin}><div className={styles.divider}><span>或使用以下方式登录</span></div><div className={styles.providerButtons}>{options.providers.map(provider => <button type="button" key={provider} disabled={busy} onClick={() => void providerLogin(provider)}>{provider === 'github' ? <GithubIcon size={18} /> : <span className={styles.googleMark} aria-hidden="true">G</span>}{provider === 'github' ? 'GitHub' : 'Google'}</button>)}</div></div>}

          <p className={styles.switchPrompt}>{register ? '已经有账号？' : '还没有 BlockOS 账号？'}<button type="button" disabled={busy} onClick={() => changeForm(!register)}>{register ? '直接登录' : '立即注册'}<ArrowRight size={13} /></button></p>

          {options.demo && <details className={styles.demo}><summary>想先体验一下？<span>企业演示空间<ChevronDown size={13} /></span></summary><div className={styles.demoContent}><p>公共演示账号，请勿存放私人内容。</p><div className={styles.demoUsers}>{DEMO_USERS.map(user => <button type="button" disabled={busy} key={user.id} onClick={() => void submit('/api/auth/simple-login', { userId: user.id })}><span>{user.name.charAt(0)}</span><span>{user.name}<small>{user.role === 'admin' ? '管理者' : '团队成员'}</small></span><ArrowRight size={13} /></button>)}</div></div></details>}
        </div>
      </section>
    </div>
    <footer className={styles.footer}>BlockOS<span />让知识与行动自然连接</footer>
  </main>;
}
