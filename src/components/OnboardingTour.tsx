'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccountStore } from '@/store/accountStore';
import {
  X, Sparkles, Move, Layers, Code, Compass,
  ChevronRight, ChevronLeft, Lightbulb, Minus, Maximize2, GripHorizontal
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
}

export const TOUR_STEPS: TourStep[] = [
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
  },
  {
    targetSelector: '[data-tour="guide-block-todo"]',
    badge: '步骤 2/5',
    category: '核心哲学 · 结构自由',
    title: '结构化组织：父子嵌套与敏捷任务追踪',
    description:
      '无界白板不等于杂乱平铺！BlockOS 支持严谨的父子嵌套结构（Sub-Block）。你可以将复杂的待办清单、技术方案与设计图自由归属到主卡片下，支持多级缩进、一键折叠与级联拖拽，让信息层级井井有条！',
    actionHint: '🌳 试一试：点击待办复选框标记完成，或体验卡片父子组织与对齐！',
    icon: Layers,
    color: 'from-emerald-500 to-teal-500',
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
  },
  {
    targetSelector: '[data-tour="toolbar-actions"]',
    badge: '步骤 5/5',
    category: '全局中枢 · 协同与看板',
    title: '全局工作台：AI 规划、角色透视与看板',
    description:
      '顶部工具栏是你的指挥中枢：快速唤起自然语言 AI 助手；查看执行历史与版本记录；按角色折叠过滤视图；点击团队图标切换至协同看板。',
    actionHint: '🎉 祝贺完成新手导览！你可以随时在右上角「帮助」中重新唤起本教程。',
    icon: Compass,
    color: 'from-cyan-500 to-blue-500',
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; width: number }>({
    top: 100,
    left: 100,
    width: 360,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ top: 0, left: 0 });
  const hasUserDraggedRef = useRef(false);

  const enterprise = useAccountStore(state => state.user?.mode === 'enterprise');
  const step = useMemo(() => {
    const base = TOUR_STEPS[currentStep];
    return !enterprise && currentStep === 1 ? { ...base, title: '用待办记录下一步', description: '把一个目标写成待办，完成后勾选。也可以将相关卡片设为子 Block，整理出清晰的知识层级。', actionHint: '试一试：勾选一项待办，或整理卡片的父子关系。' }
      : !enterprise && currentStep === 4 ? { ...base, category: '个人工作台', title: '文档、AI 与个人账号', description: '使用顶部 AI 助手、搜索、导入导出与历史版本。点击「个人模式」打开账号中心，管理资料和密码；需要协作时再开启企业模式。' } : base;
  }, [enterprise, currentStep]);
  const StepIcon = step.icon;

  const getTargetElement = useCallback(() => {
    let el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el && step.targetSelector.includes('guide-block-')) {
      const match = step.targetSelector.match(/guide-block-[a-z]+/);
      if (match) {
        el = document.querySelector(
          `[data-tour^="${match[0]}"], [data-tour*="${match[0]}"], [data-block-id^="${match[0]}"]`
        ) as HTMLElement | null;
      }
    }
    return el;
  }, [step.targetSelector]);

  const updateTargetAndCardPos = useCallback(() => {
    const el = getTargetElement();
    const cardWidth = Math.min(360, window.innerWidth - 32);

    if (!el) {
      setTargetRect(null);
      setCardPos({
        top: Math.max(20, (window.innerHeight - 380) / 2),
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

    // 如果用户在当前步骤手动拖动过卡片，保留用户自定义位置
    if (hasUserDraggedRef.current) {
      return;
    }

    const gap = 20;
    const estimatedCardHeight = 360;
    let nextTop: number;
    let nextLeft: number;

    if (currentStep === 4) {
      // 步骤 5: 顶部全局中枢工具栏，放置在工具栏下方靠右
      nextTop = rect.bottom + gap;
      nextLeft = Math.max(16, Math.min(rect.right - cardWidth, window.innerWidth - cardWidth - 20));
    } else {
      // 步骤 1~4: 针对画布中的原子 Block 卡片，统一采用一致且平滑的定位策略，彻底根除跨步位移跳跃！
      // 首选策略：贴靠在 Block 右侧，垂直对齐 Block 顶部
      if (rect.right + gap + cardWidth <= window.innerWidth - 16) {
        nextLeft = rect.right + gap;
        nextTop = rect.top;
      } else if (rect.left - gap - cardWidth >= 16) {
        // 次选策略：右侧不足时平移至 Block 左侧
        nextLeft = rect.left - gap - cardWidth;
        nextTop = rect.top;
      } else {
        // 保底策略：两侧均不足时水平居中放置在 Block 下方
        nextLeft = Math.max(16, (window.innerWidth - cardWidth) / 2);
        nextTop = Math.min(rect.bottom + gap, window.innerHeight - estimatedCardHeight - 20);
      }
    }

    // 边界安全校验，绝不超出当前窗口视口
    nextTop = Math.max(16, Math.min(nextTop, window.innerHeight - estimatedCardHeight - 16));
    nextLeft = Math.max(16, Math.min(nextLeft, window.innerWidth - cardWidth - 16));

    setCardPos({
      top: nextTop,
      left: nextLeft,
      width: cardWidth,
    });
  }, [currentStep, step, getTargetElement]);

  useEffect(() => {
    hasUserDraggedRef.current = false;
    const targetBlockMatch = step.targetSelector.match(/guide-block-[a-z]+/);
    const blockKey = targetBlockMatch ? targetBlockMatch[0] : null;

    if (blockKey) {
      window.dispatchEvent(
        new CustomEvent('blockos-scroll-to-block', {
          detail: { blockId: blockKey, tourId: blockKey, selector: step.targetSelector },
        })
      );
    }

    // 在平移滑动的 0~600ms 期间通过 rAF 连续同步定位，确保高亮聚焦框与卡片平滑跟随目标卡片飞入
    let frameId: number;
    const startTime = performance.now();
    const duration = 600;

    const trackTarget = (now: number) => {
      updateTargetAndCardPos();
      if (now - startTime < duration) {
        frameId = requestAnimationFrame(trackTarget);
      }
    };

    frameId = requestAnimationFrame(trackTarget);

    const timer1 = setTimeout(updateTargetAndCardPos, 80);
    const timer2 = setTimeout(updateTargetAndCardPos, 200);
    const timer3 = setTimeout(updateTargetAndCardPos, 450);
    const timer4 = setTimeout(updateTargetAndCardPos, 650);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [currentStep, step, updateTargetAndCardPos]);

  // 监听窗口 resize、滚动与画布平移变换
  useEffect(() => {
    let animId: number;
    const handleSync = () => {
      animId = requestAnimationFrame(updateTargetAndCardPos);
    };

    window.addEventListener('resize', handleSync);
    window.addEventListener('scroll', handleSync, true);
    window.addEventListener('blockos-canvas-transform', handleSync);

    return () => {
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
      window.removeEventListener('blockos-canvas-transform', handleSync);
      cancelAnimationFrame(animId);
    };
  }, [updateTargetAndCardPos]);

  // 卡片拖拽处理
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    hasUserDraggedRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    cardStartPos.current = { top: cardPos.top, left: cardPos.left };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      setCardPos((prev) => ({
        ...prev,
        left: Math.max(8, Math.min(window.innerWidth - prev.width - 8, cardStartPos.current.left + dx)),
        top: Math.max(8, Math.min(window.innerHeight - 80, cardStartPos.current.top + dy)),
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('blockos-onboarding-completed-v3', 'true');
    localStorage.setItem('blockos-onboarding-completed-v2', 'true');
    localStorage.setItem('blockos-onboarding-completed', 'true');
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('blockos-onboarding-completed-v3', 'true');
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
          fill="rgba(15, 23, 42, 0.52)"
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

      {/* 最小化折叠态悬浮胶囊：彻底不遮挡任何执行结果 */}
      {isMinimized ? (
        <div data-ui-control className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-blue-500/50 rounded-full shadow-2xl shadow-blue-500/25 text-xs animate-slide-up pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-gray-800 dark:text-zinc-200">
              {step.badge}
            </span>
            <span className="text-gray-500 dark:text-zinc-400 hidden sm:inline max-w-[150px] truncate">
              {step.title}
            </span>
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700" />

          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-colors"
            title="展开引导说明详情"
          >
            <span>展开</span>
            <Maximize2 className="w-3 h-3" />
          </button>

          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="text-xs text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-1"
            >
              上一步
            </button>
          )}

          <button
            onClick={handleNext}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-full shadow-sm transition-colors"
          >
            {currentStep === TOUR_STEPS.length - 1 ? '完成' : '下一步'}
          </button>

          <button
            onClick={handleSkip}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            title="跳过引导"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* 展开态浮动指引卡片：支持自由拖拽、支持一键收起、避让计算排布 */
        <div
          data-ui-control
          className="fixed z-[100] transition-[top,left] duration-300 ease-out pointer-events-auto"
          style={{
            top: cardPos.top,
            left: cardPos.left,
            width: cardPos.width,
          }}
        >
          <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
            {/* 顶栏：支持拖拽与收起折叠 */}
            <div
              onMouseDown={handleHeaderMouseDown}
              className="relative px-4 pt-3.5 pb-2.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none bg-gradient-to-r from-gray-50/50 to-transparent dark:from-zinc-800/40"
              title="按住此处可自由拖动卡片位置"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center shadow text-white shrink-0`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="inline-block text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                    {step.badge} · {step.category}
                  </span>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-0.5 line-clamp-1">
                    {step.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <GripHorizontal className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 mr-0.5" />
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  title="收起为小胶囊（避免遮挡）"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSkip}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  title="跳过引导"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 正文说明 */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {step.description}
              </p>

              {/* 试一试互动指引块 */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-snug font-medium">
                  {step.actionHint}
                </p>
              </div>

              {/* 步骤指示器点 */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'w-6 bg-blue-600 dark:bg-blue-400'
                        : 'w-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600'
                    }`}
                    title={`跳转到第 ${i + 1} 步`}
                  />
                ))}
              </div>

              {/* 底部按钮栏 */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-zinc-800">
                <button
                  onClick={handleSkip}
                  className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                >
                  跳过教程
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      上一步
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
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
      )}
    </>
  );
}
