"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CHART, DEPARTMENT_COLOR } from "@/lib/chart-theme";
import { useReducedMotion } from "./trend-chart";

export type DonutSlice = { code: string; name: string; value: number };

/** 168 px ring, 28 px thick, 2 px surface gaps; the legend and total are rendered by the server parent. */
export function CostDonutRing({ data, selected }: { data: DonutSlice[]; selected: string | null }) {
  const reduced = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={56}
          outerRadius={84}
          startAngle={90}
          endAngle={-270}
          stroke={CHART.surface}
          strokeWidth={2}
          isAnimationActive={!reduced}
          animationDuration={400}
        >
          {data.map((d) => (
            <Cell
              key={d.code}
              fill={DEPARTMENT_COLOR[d.code] ?? CHART.series1}
              fillOpacity={selected && selected !== d.code ? 0.3 : 1}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
