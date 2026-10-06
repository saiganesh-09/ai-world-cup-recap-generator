"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";

export function PlayerChart({
  data,
}: {
  data: { label: string; goals: number; assists: number; rating: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No match data available.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8b98b0", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#8b98b0", fontSize: 11 }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[5, 10]}
            tick={{ fill: "#8b98b0", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#111a30",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#eef2f8" }}
          />
          <Bar yAxisId="left" dataKey="goals" fill="#f5b335" radius={[4, 4, 0, 0]} name="Goals" />
          <Bar yAxisId="left" dataKey="assists" fill="#34d399" radius={[4, 4, 0, 0]} name="Assists" />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rating"
            stroke="#8b98b0"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Rating"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
