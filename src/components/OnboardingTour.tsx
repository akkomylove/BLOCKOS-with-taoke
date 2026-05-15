'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, MousePointer, Layout, GitBranch, Maximize2 } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    title: '欢迎来到 BlockOS',
    description: '这是一个 AI 原生的知识操作系统。采用白板模式，用 Block（块）来自由组织你的想法。',
    icon: <Sparkles className="w-8 h-8 text-blue-400" />,
  },
  {
    title: '左侧管理页面',
    description: '在左侧边栏创建和管理多个页面。每个页面都是独立的白板空间，点击即可切换，数据互不干扰。',
    icon: <MousePointer className="w-8 h-8 text-emerald-400" />,
  },
  {
    title: '添加 Block',
    description: '使用画布顶部的工具栏按钮添加不同类型的 Block，或右键点击空白处从菜单添加。',
    icon: <Layout className="w-8 h-8 text-amber-400" />,
  },
  {
    title: '自由布局',
    description: '点击 Block 标题栏可自由移动位置。使用工具栏按钮进行批量操作。滚轮缩放画布，右键空白处添加新 Block。',
    icon: <Maximize2 className="w-8 h-8 text-purple-400" />,
  },
  {
    title: 'AI 辅助',
    description: '点击 Block 的 Sparkles 按钮可调用 AI：总结、改写、扩展、生成思维导图等。',
    icon: <GitBranch className="w-8 h-8 text-cyan-400" />,
  },
];

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem('blockos-onboarding-completed');
    if (completed) {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('blockos-onboarding-completed', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('blockos-onboarding-completed', 'true');
    setIsVisible(false);
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg overflow-hidden animate-scale-in">
          <div className="relative h-40 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-b border-gray-200 dark:border-zinc-800/60">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
                步骤 {currentStep + 1}/{steps.length}
              </span>
              {currentStep === steps.length - 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                  完成
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2">{step.title}</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">{step.description}</p>

            <div className="mt-6 flex items-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-8 bg-blue-400' : 'w-4 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
              >
                跳过教程
              </button>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    上一步
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
