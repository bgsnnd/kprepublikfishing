import { requireSession } from '@/lib/auth/context'
import {
  getDashboardStats,
  getSalesChart,
  getLowStockProducts,
  getRecentActivity,
} from '@/lib/dashboard/queries'
import { StatCard } from '@/components/dashboard/stat-card'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { LowStock } from '@/components/dashboard/low-stock'
import {
  Users,
  UserCheck,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard',
}

export const dynamic = 'force-dynamic'

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function AdminPage() {
  const session = await requireSession()

  const [stats, chartData, lowStock, activities] = await Promise.all([
    getDashboardStats(),
    getSalesChart(7),
    getLowStockProducts(5),
    getRecentActivity(8),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selamat datang kembali, {session.name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total User"
          value={stats.totalUsers}
          description={`${stats.activeUsers} aktif`}
          icon={Users}
        />
        <StatCard
          title="Absensi Hari Ini"
          value={stats.attendanceToday}
          description="check-in tercatat"
          icon={UserCheck}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={stats.transactionsToday}
          description="dari kantin & pancing"
          icon={ShoppingCart}
        />
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatRupiah(stats.revenueToday)}
          description="total semua transaksi"
          icon={DollarSign}
        />
      </div>

      {/* Chart + Low Stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} />
        </div>
        <LowStock products={lowStock} />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivity activities={activities} />
        <div className="space-y-4">
          <StatCard
            title="Stok Menipis"
            value={stats.lowStockCount}
            description="produk perlu restock"
            icon={AlertTriangle}
            iconClassName="text-amber-500"
          />
        </div>
      </div>
    </div>
  )
}