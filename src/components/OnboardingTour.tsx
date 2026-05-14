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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-zinc-800/50 rounded-xl">{step.icon}</div>
          <h3 className="text-lg font-semibold text-zinc-100">{step.title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
