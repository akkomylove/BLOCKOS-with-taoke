'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Shield, User, Sparkles } from 'lucide-react';
import { DEMO_ADMIN, DEMO_EMPLOYEES } from '@/lib/demo-users';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async (userId: string, name: string, email: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, email }),
      });
      if (!res.ok) throw new Error('登录失败');
      window.location.href = '/';
    } catch {
      setError('登录失败，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">CircleLight</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">AI 驱动的项目协作平台</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20">
            <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              管理者账号
            </h2>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">可管理团队、添加成员、查看所有任务</p>
          </div>
          <button
            onClick={() => handleDemoLogin(DEMO_ADMIN.id, DEMO_ADMIN.name, DEMO_ADMIN.email)}
            disabled={loading}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold">
              {DEMO_ADMIN.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{DEMO_ADMIN.name}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{DEMO_ADMIN.title}</p>
            </div>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
              管理者
            </span>
          </button>
        </div>

        <div className="mt-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              员工账号
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">仅查看任务、无法管理团队</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-700">
            {DEMO_EMPLOYEES.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleDemoLogin(emp.id, emp.name, emp.email)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{emp.name}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{emp.title}</p>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 rounded text-xs">
                  员工
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-6">
          Demo 模式 · 数据仅存储在本地
        </p>
      </div>
    </div>
  );
}