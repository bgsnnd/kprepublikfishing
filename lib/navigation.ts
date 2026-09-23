import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ScanFace,
  CalendarDays,
  CalendarOff,
  ShoppingCart,
  Fish,
  Package,
  Users,
  Shield,
  Wallet,
  FileText,
  Settings,
  Briefcase,
  MapPin,
  Layers,
  DollarSign,
  Coins,
} from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  permission?: string
  children?: NavItem[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const NAVIGATION: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        title: 'Absensi',
        href: '/admin/attendance',
        icon: ScanFace,
        permission: 'attendance.read',
      },
      {
        title: 'Lokasi',
        href: '/admin/locations',
        icon: MapPin,
        permission: 'location.read',
      },
      {
        title: 'Jadwal',
        href: '/admin/schedule',
        icon: CalendarDays,
        permission: 'schedule.read',
      },
      {
        title: 'Hari Libur',
        href: '/admin/holidays',
        icon: CalendarOff,
        permission: 'schedule.read',
      },
      {
        title: 'Sesi Caddy',
        href: '/admin/caddy',
        icon: Fish,
        permission: 'caddy.read',
      },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      {
        title: 'Kasir Kantin',
        href: '/admin/pos/kantin',
        icon: ShoppingCart,
        permission: 'pos.kantin',
      },
      {
        title: 'Kasir Pancing',
        href: '/admin/pos/pancing',
        icon: ShoppingCart,
        permission: 'pos.pancing',
      },
      {
        title: 'Kategori',
        href: '/admin/categories',
        icon: Layers,
        permission: 'category.read',
      },
      {
        title: 'Produk',
        href: '/admin/products',
        icon: Package,
        permission: 'product.read',
      },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      {
        title: 'Komponen Gaji',
        href: '/admin/salary-components',
        icon: Coins,
        permission: 'payroll.read',
      },
      {
        title: 'Setting Gaji',
        href: '/admin/salary-config',
        icon: DollarSign,
        permission: 'payroll.read',
      },
      {
        title: 'Penggajian',
        href: '/admin/payroll',
        icon: Wallet,
        permission: 'payroll.read',
      },
      {
        title: 'Laporan',
        href: '/admin/reports',
        icon: FileText,
        permission: 'report.read',
      },
    ],
  },
  {
    label: 'Manajemen',
    items: [
      {
        title: 'User',
        href: '/admin/users',
        icon: Users,
        permission: 'user.read',
      },
      {
        title: 'Tipe Karyawan',
        href: '/admin/employee-types',
        icon: Briefcase,
        permission: 'employee_type.read',
      },
      {
        title: 'Role & Permission',
        href: '/admin/roles',
        icon: Shield,
        permission: 'role.read',
      },
      {
        title: 'Audit Log',
        href: '/admin/audit',
        icon: FileText,
        permission: 'audit.read',
      },
      {
        title: 'Pengaturan',
        href: '/admin/settings',
        icon: Settings,
        permission: 'system.settings',
      },
    ],
  },
]