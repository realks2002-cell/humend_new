"use client";

import { Bar, BarChart, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const CHART = {
  navy: "#001946",
  navyMid: "#3D68AD",
  navyLight: "#9DB9E5",
  axis: "#6B7280",
};

interface ApplicationChartProps {
  pending: number;
  approved: number;
  rejected: number;
}

const appChartConfig = {
  approved: { label: "승인", color: CHART.navy },
  pending: { label: "대기", color: CHART.navyMid },
  rejected: { label: "거절", color: CHART.navyLight },
} satisfies ChartConfig;

export function ApplicationPieChart({ pending, approved, rejected }: ApplicationChartProps) {
  const data = [
    { name: "승인", value: approved, fill: CHART.navy },
    { name: "대기", value: pending, fill: CHART.navyMid },
    { name: "거절", value: rejected, fill: CHART.navyLight },
  ];

  const total = pending + approved + rejected;

  if (total === 0) {
    return (
      <div className="flex h-[114px] items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative h-[114px] w-[114px] shrink-0">
        <ChartContainer config={appChartConfig} className="h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data.filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={55}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.filter((d) => d.value > 0).map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-xl font-bold leading-tight tabular-nums text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">전체 건</span>
        </div>
      </div>
      <ul className="grid gap-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
            <span className="text-gray-900">{d.name}</span>
            <span className="tabular-nums text-gray-500">{d.value}건</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PayrollBarChartProps {
  data: { label: string; amount: number }[];
}

const payrollChartConfig = {
  amount: { label: "급여", color: CHART.navy },
} satisfies ChartConfig;

export function PayrollBarChart({ data }: PayrollBarChartProps) {
  if (data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[313px]">
      <ChartContainer config={payrollChartConfig} className="absolute inset-0 aspect-auto">
        <BarChart data={data} margin={{ top: 20 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: CHART.axis }} />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? CHART.navy : CHART.navyMid} />
            ))}
            <LabelList
              dataKey="amount"
              position="top"
              fontSize={11}
              fill={CHART.navy}
              fontWeight={600}
              formatter={(v: number) => (v === 0 ? "" : `${Math.round(v / 10000).toLocaleString("ko-KR")}만`)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

interface AppInstallChartProps {
  android: number;
  ios: number;
  total: number;
}

export function AppInstallChart({ android, ios, total }: AppInstallChartProps) {
  if (total === 0) {
    return (
      <div className="flex h-[72px] items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  const rows = [
    { label: "Android", value: android, fill: CHART.navy },
    { label: "iOS", value: ios, fill: CHART.navyMid },
  ];

  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[64px_1fr_64px] items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{r.label}</span>
          <div className="h-5 overflow-hidden rounded-[4px] bg-[#F2F7FF]">
            <div className="h-full rounded-[4px]" style={{ width: `${(r.value / total) * 100}%`, backgroundColor: r.fill }} />
          </div>
          <span className="text-right text-sm font-semibold tabular-nums text-gray-900">
            {r.value.toLocaleString("ko-KR")}명
          </span>
        </li>
      ))}
    </ul>
  );
}
