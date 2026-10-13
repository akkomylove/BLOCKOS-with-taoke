'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Sparkles, Move, Bot, Code, Compass,
  ChevronRight, ChevronLeft, Lightbulb
} from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  targetSelector: string;
  badge: string;
  category: string;
  title: string;
  description: string;
  actionHint: string;
  icon: React.ElementType;
  color: string;
  placement: 'right' | 'bottom' | 'left' | 'top' | 'auto';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="guide-block-welcome"]',
    badge: '步骤 1/5',
    category: '核心哲学 · 结构自由',
    title: '打破传统文档线性束缚：原子 Block',
    description:
      'BlockOS 告别了传统单页长文。每一个信息都是可自由拖拽、调整尺寸与嵌套的原子 Block（块）。按住卡片顶部标题栏可自由移动，拖动右侧边缘即可缩放宽度。',
    actionHint: '💡 试一试：按住高亮卡片的标题栏自由拖动，感受白板排版的无限自由！',
    icon: Move,
    color: 'from-blue-500 to-indigo-500',
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="guide-block-todo"]',
    badge: '步骤 2/5',
    category: '核心哲学 · 行动自由',
    title: '文档化身活体：Agent 自主监听与行动',
    description:
      '文档不再只是被动等待人类编辑的容器！BlockOS 内置规则引擎，时刻监听待办等状态变化。一旦勾选任务，后台 Agent 立即捕获事件，自动追加完成时间戳日志并调用大模型送上祝贺语。',
    actionHint: '⚡ 试一试：点击左侧待办的勾选框，见证文档如何自主产生行动！',
    icon: Bot,
    color: 'from-emerald-500 to-teal-500',
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="guide-block-ai"]',
    badge: '步骤 3/5',
    category: '核心哲学 · 能力自由',
    title: '环境级智能：单 Block 专属 AI 驱动',
    description:
      'AI 不是浮于表面的聊天框，而是深度渗透在每个 Block 之间。鼠标悬停在卡片右侧，点击出现的 ✨ (Sparkles) 按钮，即可享受单块专属 AI：智能总结、扩写改写或生成思维导图。已直连智谱 GLM 4.7/4 Flash 极速推理！',
    actionHint: '🧠 试一试：悬停高亮卡片并点击右侧 ✨ 按钮，体验秒级大模型生成！',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="guide-block-code"]',
    badge: '步骤 4/5',
    category: '核心哲学 · 开放可编程',
    title: '基于 Web 标准 (+html)：多语言代码沙箱即时运行',
    description:
      '代码块不是冷冰冰的静态文本！无需配置本地环境，在 Block 中即可编写 JavaScript、TypeScript 或 Python 代码，并在前端沙箱中即时执行并查看控制台输出，支持跨 Block 数据引用。',
    actionHint: '💻 试一试：点击代码卡片右上角绿色的「运行」按钮，即可看到控制台执行输出！',
    icon: Code,
    color: 'from-amber-500 to-orange-500',
    placement: 'left',
  },
  {
    targetSelector: '[data-tour="toolbar-actions"]',
    badge: '步骤 5/5',
    category: '全局中枢 · 协同与看板',
    title: '全局工作台：Agent 日志、角色透视与看板',
    description:
      '顶部工具栏是你的指挥中枢：点击 Activity 图标实时审计 Agent 自动化操作日志；按 Ctrl+K 唤起自然语言命令；按角色折叠过滤视图；点击团队图标切换至协同看板。',
    actionHint: '🎉 祝贺完成新手导览！你可以随时在右上角「帮助」中重新唤起本教程。',
    icon: Compass,
    color: 'from-cyan-500 to-blue-500',
    placement: 'bottom',
  },
];

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; width: number }>({
    top: 100,
    left: 100,
    width: 440,
  });

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  const updateTargetAndCardPos = useCallback(() => {
    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    const cardWidth = Math.min(440, window.innerWidth - 32);

    if (!el) {
      setTargetRect(null);
      // 居中回退布局
      setCardPos({
        top: Math.max(20, (window.innerHeight - 360) / 2),
        left: Math.max(16, (window.innerWidth - cardWidth) / 2),
        width: cardWidth,
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    const gap = 16;
    let nextTop = rect.top;
    let nextLeft = rect.right + gap;

    if (step.placement === 'bottom' || rect.right + gap + cardWidth > window.innerWidth) {
      // 放置在下方或自适应屏幕
      if (rect.bottom + gap + 360 <= window.innerHeight) {
        nextTop = rect.bottom + gap;
        nextLeft = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
      } else if (rect.top - gap - 360 >= 0) {
        // 放置在上方
        nextTop = rect.top - 360 - gap;
        nextLeft = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
      } else if (rect.left - gap - cardWidth >= 0) {
        // 放置在左侧
        nextTop = Math.max(16, Math.min(rect.top, window.innerHeight - 380));
        nextLeft = rect.left - gap - cardWidth;
      } else {
        // 居中
        nextTop = Math.max(16, (window.innerHeight - 360) / 2);
        nextLeft = Math.max(16, (window.innerWidth - cardWidth) / 2);
      }
    } else if (step.placement === 'left') {
      if (rect.left - gap - cardWidth >= 0) {
        nextTop = Math.max(16, Math.min(rect.top, window.innerHeight - 380));
        nextLeft = rect.left - gap - cardWidth;
      } else {
        nextTop = rect.bottom + gap;
        nextLeft = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
      }
    } else {
      // 默认右侧
      nextTop = Math.max(16, Math.min(rect.top, window.innerHeight - 380));
      nextLeft = rect.right + gap;
    }

    // 确保不超出视口下界和上界
    nextTop = Math.max(16, Math.min(nextTop, window.innerHeight - 380));
    nextLeft = Math.max(16, Math.min(nextLeft, window.innerWidth - cardWidth - 16));

    setCardPos({
      top: nextTop,
      left: nextLeft,
      width: cardWidth,
    });
  }, [step]);

  // 当步骤切换时，自动滚动目标到可视区域，并计算位置
  useEffect(() => {
    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {
        // ignore scroll error
      }
    }

    // 延时一次等待平滑滚动完成
    updateTargetAndCardPos();
    const timer = setTimeout(updateTargetAndCardPos, 150);
    return () => clearTimeout(timer);
  }, [currentStep, step, updateTargetAndCardPos]);

  // 监听窗口 resize 与滚动
  useEffect(() => {
    let animId: number;
    const handleSync = () => {
      animId = requestAnimationFrame(updateTargetAndCardPos);
    };

    window.addEventListener('resize', handleSync);
    window.addEventListener('scroll', handleSync, true);

    return () => {
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
      cancelAnimationFrame(animId);
    };
  }, [updateTargetAndCardPos]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('blockos-onboarding-completed-v2', 'true');
    localStorage.setItem('blockos-onboarding-completed', 'true');
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('blockos-onboarding-completed-v2', 'true');
    localStorage.setItem('blockos-onboarding-completed', 'true');
    setIsVisible(false);
    onSkip();
  }, [onSkip]);

  // 键盘快捷键响应 (Esc 跳过, 方向键或回车切换)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          handleComplete();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, handleComplete, handleSkip]);

  if (!isVisible) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
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

  return (
    <>
      {/* 遮罩层：带有聚光灯镂空 (SVG Mask) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[90] transition-opacity duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.58)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* 目标元素聚焦环 (Spotlight Glow Ring) */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.25),0_0_35px_rgba(59,130,246,0.45)] transition-all duration-300 ease-out z-[95]"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          {/* 脉冲角标 */}
          <div className="absolute -top-3.5 -right-3.5 flex h-7 w-7">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-7 w-7 bg-blue-600 text-white text-xs font-bold items-center justify-center shadow-lg border border-white/50">
              {currentStep + 1}
            </span>
          </div>
        </div>
      )}

      {/* 浮动指引卡片 (Interactive Step Card) */}
      <div
        className="fixed z-[100] transition-all duration-300 ease-out pointer-events-auto"
        style={{
          top: cardPos.top,
          left: cardPos.left,
          width: cardPos.width,
        }}
      >
        <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
          {/* 顶栏渐变装饰与图标 */}
          <div className="relative px-5 pt-4 pb-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-md text-white`}
              >
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  {step.badge} · {step.category}
                </span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-0.5">
                  {step.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              title="跳过引导"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 正文说明 */}
          <div className="p-5 space-y-3.5">
            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              {step.description}
            </p>

            {/* 试一试互动指引块 */}
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-snug font-medium">
                {step.actionHint}
              </p>
            </div>

            {/* 步骤指示器点 */}
            <div className="flex items-center gap-1.5 pt-1">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-7 bg-blue-600 dark:bg-blue-400'
                      : 'w-2.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600'
                  }`}
                  title={`跳转到第 ${i + 1} 步`}
                />
              ))}
            </div>

            {/* 底部按钮栏 */}
            <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                跳过教程
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    上一步
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      <span>开始使用</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>下一步</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
