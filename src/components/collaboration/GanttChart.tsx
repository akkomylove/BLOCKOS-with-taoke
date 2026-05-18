'use client';

import { useMemo } from 'react';
import type { Task } from '@/types/collaboration';

interface GanttChartProps {
  tasks: Task[];
}

const priorityColors: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F97316',
  urgent: '#EF4444',
};

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};

function formatDateCN(date: number | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekNumber(date: number | Date, projectStart: number): number {
  const d = new Date(date);
  const start = new Date(projectStart);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (7 * 86400000)) + 1;
}

export function GanttChart({ tasks }: GanttChartProps) {
  const today = new Date();
  const now = Date.now();

  const allTasks = tasks.length > 0 ? tasks : [];

  const { startDate, endDate, totalDays, projectStart } = useMemo(() => {
    if (allTasks.length === 0) return { startDate: new Date(), endDate: new Date(), totalDays: 1, projectStart: now };
    const dates = allTasks.map(t => t.startDate || t.createdAt || now);
    const endDates = allTasks.map(t => t.dueDate || now + 30 * 86400000);
    const start = new Date(Math.min(...dates, today.getTime() - 7 * 86400000));
    const end = new Date(Math.max(...endDates, today.getTime() + 30 * 86400000));
    return {
      startDate: start,
      endDate: end,
      totalDays: Math.max(Math.ceil((end.getTime() - start.getTime()) / 86400000), 1),
      projectStart: Math.min(...dates),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks.length]);

  const HEADER_HEIGHT = 44;
  const ROW_HEIGHT = 40;
  const LEFT_WIDTH = 220;
  const DAY_WIDTH = 28;

  const months = useMemo(() => {
    const result: { label: string; x: number; days: number }[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const start = Math.max(monthStart.getTime(), startDate.getTime());
      const end = Math.min(monthEnd.getTime() + 86400000, endDate.getTime() + 86400000);
      const daysFromStart = Math.max(0, Math.floor((start - startDate.getTime()) / 86400000));
      const monthDays = Math.ceil((end - start) / 86400000);
      result.push({
        label: `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`,
        x: daysFromStart,
        days: monthDays,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [startDate, endDate]);

  if (allTasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
        <p className="text-sm">暂无任务</p>
      </div>
    );
  }

  const svgWidth = LEFT_WIDTH + totalDays * DAY_WIDTH;
  const svgHeight = HEADER_HEIGHT + allTasks.length * ROW_HEIGHT + 20;
  const todayX = LEFT_WIDTH + Math.floor((today.getTime() - startDate.getTime()) / 86400000) * DAY_WIDTH;

  const getBarX = (date: number) => {
    return LEFT_WIDTH + Math.floor((date - startDate.getTime()) / 86400000) * DAY_WIDTH;
  };

  const getBarWidth = (start: number, end: number) => {
    return Math.max(Math.floor((end - start) / 86400000) * DAY_WIDTH, 18);
  };

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900">
      <svg width={svgWidth} height={svgHeight} className="min-w-full">
        {months.map((m, i) => (
          <g key={i}>
            <rect
              x={LEFT_WIDTH + m.x * DAY_WIDTH}
              y={0}
              width={m.days * DAY_WIDTH}
              height={HEADER_HEIGHT}
              fill="#f9fafb"
              stroke="#e5e7eb"
              className="dark:fill-zinc-800 dark:stroke-zinc-700"
            />
            <text
              x={LEFT_WIDTH + m.x * DAY_WIDTH + (m.days * DAY_WIDTH) / 2}
              y={HEADER_HEIGHT / 2 + 4}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-zinc-400"
              fontSize="12"
              fontWeight="500"
            >
              {m.label}
            </text>
          </g>
        ))}

        {todayX > LEFT_WIDTH && todayX < svgWidth && (
          <line
            x1={todayX} y1={HEADER_HEIGHT}
            x2={todayX} y2={svgHeight}
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />
        )}

        {allTasks.map((task, i) => {
          const taskStart = task.startDate || task.createdAt || now;
          const taskEnd = task.dueDate || now + 7 * 86400000;
          const barX = getBarX(taskStart);
          const barW = getBarWidth(taskStart, taskEnd);
          const barY = HEADER_HEIGHT + i * ROW_HEIGHT + 9;
          const color = priorityColors[task.priority] || '#6B7280';
          const weekStart = getWeekNumber(taskStart, projectStart);
          const weekEnd = getWeekNumber(taskEnd, projectStart);

          return (
            <g key={task.id}>
              <rect
                x={0} y={HEADER_HEIGHT + i * ROW_HEIGHT}
                width={svgWidth} height={ROW_HEIGHT}
                fill={i % 2 === 0 ? '#f9fafb' : '#ffffff'}
                className="dark:fill-none"
              />
              <rect
                x={0} y={HEADER_HEIGHT + i * ROW_HEIGHT}
                width={svgWidth} height={ROW_HEIGHT}
                stroke="#f3f4f6"
                strokeWidth="0.5"
                className="dark:stroke-zinc-800"
              />
              <text
                x={8} y={barY + 5}
                className="fill-gray-700 dark:fill-zinc-300"
                fontSize="11"
              >
                {task.title.length > 18 ? task.title.slice(0, 16) + '...' : task.title}
              </text>
              <text
                x={8} y={barY + 18}
                className="fill-gray-400 dark:fill-zinc-500"
                fontSize="9"
              >
                {statusLabels[task.status] || task.status}
              </text>
              <line
                x1={LEFT_WIDTH - 5} y1={HEADER_HEIGHT + i * ROW_HEIGHT}
                x2={LEFT_WIDTH - 5} y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#e5e7eb" strokeWidth="1"
                className="dark:stroke-zinc-700"
              />
              <rect
                x={barX} y={barY}
                width={barW} height={22}
                rx={4} ry={4}
                fill={color}
                opacity={task.status === 'done' ? 0.45 : 0.85}
              >
                <title>{`${task.title}\n状态: ${statusLabels[task.status]}\n负责人: ${task.assigneeId || '未分配'}\n开始: ${formatDateCN(taskStart)} (第${weekStart}周)\n截止: ${formatDateCN(taskEnd)} (第${weekEnd}周)\n优先级: ${task.priority}`}</title>
              </rect>
              {barW > 70 && (
                <text
                  x={barX + 4} y={barY + 15}
                  fill="white"
                  fontSize="9"
                  className="pointer-events-none"
                >
                  {`${formatDateCN(taskStart)} - ${formatDateCN(taskEnd)}`}
                </text>
              )}
              {barW <= 70 && barW > 30 && (
                <text
                  x={barX + 4} y={barY + 15}
                  fill="white"
                  fontSize="9"
                  className="pointer-events-none"
                >
                  {`${new Date(taskStart).getMonth() + 1}/${new Date(taskStart).getDate()}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-zinc-700">
        {Object.entries(priorityColors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {key === 'low' ? '低' : key === 'medium' ? '中' : key === 'high' ? '高' : '紧急'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-0 border-t border-dashed border-red-400" />
          <span className="text-xs text-gray-400 dark:text-zinc-500">今天</span>
        </div>
      </div>
    </div>
  );
}