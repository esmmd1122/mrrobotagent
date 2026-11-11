'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Point = { date: string; orders: number; revenue: number }

export function DashboardChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-white/50">
        هنوز سفارشی ثبت نشده — نمودار پس از اولین سفارش نمایش داده می‌شود.
      </p>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e10600" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#e10600" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2a2b35" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#121318',
              border: '1px solid #2a2b35',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="درآمد"
            stroke="#e10600"
            fill="url(#rev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
