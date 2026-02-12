"use client";

import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ApplicationChartProps {
  pending: number;
  approved: number;
  rejected: number;
}

const appChartConfig = {
  pending: { label: "대기", color: "hsl(38, 92%, 50%)" },
  approved: { label: "승인", color: "hsl(142, 71%, 45%)" },
  rejected: { label: "거절", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

export function ApplicationPieChart({ pending, approved, rejected }: ApplicationChartProps) {
  const data = [
    { name: "대기", value: pending, fill: "hsl(38, 92%, 50%)" },
    { name: "승인", value: approved, fill: "hsl(142, 71%, 45%)" },
    { name: "거절", value: rejected, fill: "hsl(0, 84%, 60%)" },
  ].filter((d) => d.value > 0);

  const total = pending + approved + rejected;

  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div>
      <ChartContainer config={appChartConfig} className="mx-auto h-[200px] w-[200px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PayrollBarChartProps {
  data: { label: string; amount: number }[];
}

const payrollChartConfig = {
  amount: { label: "급여", color: "hsl(262, 83%, 58%)" },
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
    <ChartContainer config={payrollChartConfig} className="h-[200px] w-full">
      <BarChart data={data}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="amount" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
