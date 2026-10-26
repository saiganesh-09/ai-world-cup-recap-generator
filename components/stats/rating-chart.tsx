"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Per-match rating progression — client component (recharts).
export function RatingChart({ data }: { data: { label: string; rating: number }[] }) {
  if (data.length < 2) return null;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#8fa3bf" }}
            axisLine={{ stroke: "#1f2f4a" }}
            tickLine={false}
          />
          <YAxis
            domain={[4, 10]}
            tick={{ fontSize: 10, fill: "#8fa3bf" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#101a2c",
              border: "1px solid #1f2f4a",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e6edf7" }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#f5b942"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#f5b942" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
