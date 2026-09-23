import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  calculatePayroll,
  buildPayrollPeriod,
  type PayrollPeriod,
} from '../lib/payroll/calculator'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

// ============================================================
// CLI Args Parser
// ============================================================
//
// Usage:
//   npx tsx prisma/test-calculator.ts <username> [options]
//
// Options:
//   --month=9 --year=2026        → bulanan (26 Agu - 25 Sep)
//   --date=2026-09-23            → harian (1 hari)
//   --week=2026-09-23            → mingguan (Senin-Minggu dari tanggal)
//   --from=2026-09-01 --to=2026-09-30  → range custom
//   --help                       → bantuan
//

type Args = {
  username: string
  month?: number
  year?: number
  date?: string
  week?: string
  from?: string
  to?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🧮 Test Payroll Calculator

Usage:
  npx tsx prisma/test-calculator.ts <username> [options]

Options (pilih salah satu):
  --month=9 --year=2026        Bulanan (26 Agu - 25 Sep)
  --date=2026-09-23            Harian (1 hari)
  --week=2026-09-23            Mingguan (Senin - Minggu)
  --from=2026-09-01 --to=2026-09-30  Range custom

Contoh:
  npx tsx prisma/test-calculator.ts test2 --month=9 --year=2026
  npx tsx prisma/test-calculator.ts test2 --date=2026-09-23
  npx tsx prisma/test-calculator.ts test2 --week=2026-09-23
  npx tsx prisma/test-calculator.ts test2 --from=2026-09-01 --to=2026-09-30
`)
    process.exit(0)
  }

  const username = args[0]
  const result: Args = { username }

  for (const arg of args.slice(1)) {
    const [key, value] = arg.replace(/^--/, '').split('=')

    switch (key) {
      case 'month':
        result.month = Number(value)
        break
      case 'year':
        result.year = Number(value)
        break
      case 'date':
        result.date = value
        break
      case 'week':
        result.week = value
        break
      case 'from':
        result.from = value
        break
      case 'to':
        result.to = value
        break
    }
  }

  return result
}

// ============================================================
// Build custom period from args
// ============================================================

function buildCustomPeriod(args: Args): PayrollPeriod | null {
  const now = new Date()

  // Range custom
  if (args.from || args.to) {
    const from = args.from ?? args.to!
    const to = args.to ?? args.from!

    const [fy, fm, fd] = from.split('-').map(Number)
    const [ty, tm, td] = to.split('-').map(Number)

    return {
      periodStart: new Date(Date.UTC(fy, fm - 1, fd)),
      periodEnd: new Date(Date.UTC(ty, tm - 1, td)),
      periodMonth: tm,
      periodYear: ty,
    }
  }

  // Harian
  if (args.date) {
    const [y, m, d] = args.date.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))

    return {
      periodStart: date,
      periodEnd: date,
      periodMonth: m,
      periodYear: y,
    }
  }

  // Mingguan (Senin-Minggu)
  if (args.week) {
    const [y, m, d] = args.week.split('-').map(Number)
    const refDate = new Date(Date.UTC(y, m - 1, d))

    const dayOfWeek = refDate.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(refDate)
    monday.setUTCDate(refDate.getUTCDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)

    return {
      periodStart: monday,
      periodEnd: sunday,
      periodMonth: m,
      periodYear: y,
    }
  }

  return null
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🧮 Test Payroll Calculator\n')

  const args = parseArgs()

  // ============================================================
  // 1. Ambil user
  // ============================================================
  const user = await prisma.user.findUnique({
    where: { username: args.username },
    select: {
      id: true,
      name: true,
      username: true,
      userRoles: {
        select: {
          role: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (!user) {
    console.log(`❌ User "${args.username}" tidak ditemukan`)
    process.exit(1)
  }

  const roleName = user.userRoles[0]?.role?.name ?? '(tanpa role)'
  console.log(`👤 User: ${user.name} (@${user.username})`)
  console.log(`🎭 Role: ${roleName}\n`)

  // ============================================================
  // 2. Tentukan periode
  // ============================================================
  const now = new Date()
  const month = args.month ?? now.getMonth() + 1
  const year = args.year ?? now.getFullYear()

  let period: PayrollPeriod
  let periodLabel: string

  // Cek custom period dulu
  const customPeriod = buildCustomPeriod(args)

  if (customPeriod) {
    period = customPeriod

    if (args.from || args.to) {
      periodLabel = `Range custom`
    } else if (args.date) {
      periodLabel = `Harian`
    } else {
      periodLabel = `Mingguan`
    }
  } else {
    // Bulanan (dari setting)
    period = await buildPayrollPeriod(month, year)
    periodLabel = `Bulanan (dari setting)`
  }

  console.log(`📅 Periode: ${periodLabel}`)
  console.log(
    `   ${period.periodStart.toISOString().slice(0, 10)} → ${period.periodEnd.toISOString().slice(0, 10)}\n`,
  )

  // ============================================================
  // 3. Hitung payroll
  // ============================================================
  console.log('⏳ Menghitung...\n')

  const result = await calculatePayroll(user.id, period)

  // ============================================================
  // 4. Print hasil
  // ============================================================

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 SNAPSHOT ABSENSI')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Hari Kerja:      ${result.workingDays} hari`)
  console.log(`  Hari Hadir:      ${result.presentDays} hari`)
  console.log(`  Alpha:           ${result.absentDays} hari`)
  console.log(`  Hari Telat:      ${result.lateDays} hari`)
  console.log(`  Total Telat:     ${result.totalLateMinutes} menit`)
  console.log(
    `  Total Jam Kerja: ${(result.totalWorkMinutes / 60).toFixed(1)} jam`,
  )
  console.log(`  Sesi Caddy:      ${result.totalSessions} sesi`)
  console.log()

  if (result.items.length === 0) {
    console.log('⚠️  Tidak ada komponen gaji yang dihitung.')
    console.log(
      '   Kemungkinan: user belum punya config gaji di RoleSalaryConfig / UserSalaryConfig.\n',
    )
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💰 RINCIAN GAJI')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const earnings = result.items.filter(
      (i) => i.componentType === 'EARNING',
    )
    if (earnings.length > 0) {
      console.log('\n  ➕ PENDAPATAN:')
      for (const item of earnings) {
        const qty =
          item.quantity !== null ? ` (${item.notes ?? item.quantity})` : ''
        console.log(
          `     ${item.componentName.padEnd(28)} ${formatRp(item.finalAmount).padStart(15)}${qty}`,
        )
      }
      console.log(`     ${'─'.repeat(44)}`)
      console.log(
        `     ${'Total Pendapatan'.padEnd(28)} ${formatRp(result.grossEarning).padStart(15)}`,
      )
    }

    const deductions = result.items.filter(
      (i) => i.componentType === 'DEDUCTION',
    )
    if (deductions.length > 0) {
      console.log('\n  ➖ POTONGAN:')
      for (const item of deductions) {
        const qty =
          item.quantity !== null ? ` (${item.notes ?? item.quantity})` : ''
        console.log(
          `     ${item.componentName.padEnd(28)} ${formatRp(item.finalAmount).padStart(15)}${qty}`,
        )
      }
      console.log(`     ${'─'.repeat(44)}`)
      console.log(
        `     ${'Total Potongan'.padEnd(28)} ${formatRp(result.totalDeduction).padStart(15)}`,
      )
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(
    `  ${'GAJI BERSIH (NET)'.padEnd(28)} ${formatRp(result.netSalary).padStart(15)}`,
  )
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('✅ Selesai!\n')
}

function formatRp(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })