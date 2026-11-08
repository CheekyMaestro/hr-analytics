"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useSyncExternalStore } from "react";
import { CHART, DASH_PATTERN } from "@/lib/chart-theme";
import { formatAbsenteeism, formatDecimal, formatMonth, formatTurnover } from "@/lib/domain/format";

export type TrendPoint = { month: string; label: string; turnover: number; absenteeism: number };

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

function TrendTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const p = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-sm bg-tooltip px-3 py-2 text-small text-tooltip-foreground shadow-popover">
      <p className="font-bold">{formatMonth(p.month)}</p>
      <p>Turnover {formatTurnover(p.turnover)}</p>
      <p>Absensi {formatAbsenteeism(p.absenteeism)}</p>
    </div>
  );
}

/** Turnover vs absensi per bulan (FR-11). Series differ by colour and by line pattern. */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const reduced = useReducedMotion();
  const peak = data.reduce<TrendPoint | null>((a, p) => (!a || p.turnover > a.turnover ? p : a), null);
  const top = Math.max(4, Math.ceil(Math.max(...data.map((d) => Math.max(d.turnover, d.absenteeism)))));
  const ticks = Array.from({ length: top + 1 }, (_, i) => i);
  // Keep the peak label inside the plot when the peak is near either edge.
  const peakIndex = peak ? data.indexOf(peak) : -1;
  const labelPosition = peakIndex >= data.length - 2 ? "left" : peakIndex <= 1 ? "right" : "top";

  return (
    <div className="h-full min-h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 28, right: 12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="turnover-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.12} />
              <stop offset="100%" stopColor={CHART.series1} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART.axis, fontSize: 12 }} />
          <YAxis
            domain={[0, top]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
            tickFormatter={(v: number) => `${formatDecimal(v, 0)}%`}
          />
          <Tooltip content={TrendTooltip} cursor={{ stroke: CHART.grid }} />
          <Area
            type="monotone"
            dataKey="turnover"
            stroke={CHART.series1}
            strokeWidth={3}
            fill="url(#turnover-fill)"
            isAnimationActive={!reduced}
            animationDuration={400}
          />
          <Line
            type="monotone"
            dataKey="absenteeism"
            stroke={CHART.series2}
            strokeWidth={3}
            strokeDasharray={DASH_PATTERN}
            dot={false}
            isAnimationActive={!reduced}
            animationDuration={400}
          />
          {peak && (
            <>
              <ReferenceLine x={peak.label} stroke={CHART.axis} strokeDasharray="4 4" />
              <ReferenceDot
                x={peak.label}
                y={peak.turnover}
                r={6}
                fill={CHART.surface}
                stroke={CHART.series1}
                strokeWidth={3}
                label={{
                  value: `${peak.label} · ${formatTurnover(peak.turnover)}`,
                  position: labelPosition,
                  offset: 12,
                  fill: CHART.text,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
