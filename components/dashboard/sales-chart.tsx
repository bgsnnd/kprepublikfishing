'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesChartPoint } from '@/lib/dashboard/queries'

type SalesChartProps = {
  data: SalesChartPoint[]
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`
  return `Rp${value}`
}

export function SalesChart({ data }: SalesChartProps) {
  const isEmpty = data.every((d) => d.kantin === 0 && d.pancing === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Penjualan 7 Hari Terakhir</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Belum ada transaksi
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatRupiah}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => {
                const num = typeof value === 'number' ? value : Number(value ?? 0)
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                }).format(num)
                }}
              />
              <Bar
                dataKey="kantin"
                name="Kantin"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pancing"
                name="Pancing"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}