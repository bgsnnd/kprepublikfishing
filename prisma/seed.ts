import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function seedSalaryComponents() {
  console.log('🌱 Seeding salary components...')

  const components = [
    // ============================================================
    // EARNING
    // ============================================================
    {
      code: 'BASIC_SALARY',
      name: 'Gaji Pokok',
      description: 'Gaji pokok bulanan',
      type: 'EARNING',
      calcMethod: 'FIXED',
      defaultAmount: null,
      sortOrder: 1,
      isTaxable: true,
      isSystem: true,
    },
    {
      code: 'TRANSPORT',
      name: 'Tunjangan Transport',
      description: 'Tunjangan transport bulanan',
      type: 'EARNING',
      calcMethod: 'FIXED',
      defaultAmount: null,
      sortOrder: 2,
      isTaxable: false,
      isSystem: false,
    },
    {
      code: 'MEAL_ALLOWANCE',
      name: 'Tunjangan Makan',
      description: 'Tunjangan makan per hari hadir',
      type: 'EARNING',
      calcMethod: 'PER_DAY',
      defaultAmount: 25000,
      sortOrder: 3,
      isTaxable: false,
      isSystem: false,
    },
    {
      code: 'OVERTIME',
      name: 'Lembur',
      description: 'Upah lembur per jam',
      type: 'EARNING',
      calcMethod: 'PER_HOUR',
      defaultAmount: 20000,
      sortOrder: 4,
      isTaxable: true,
      isSystem: false,
    },
    {
      code: 'BONUS',
      name: 'Bonus',
      description: 'Bonus / insentif',
      type: 'EARNING',
      calcMethod: 'FIXED',
      defaultAmount: null,
      sortOrder: 5,
      isTaxable: true,
      isSystem: false,
    },

    // ============================================================
    // DEDUCTION
    // ============================================================
    {
      code: 'LATE_PENALTY',
      name: 'Potongan Telat',
      description: 'Potongan keterlambatan per menit',
      type: 'DEDUCTION',
      calcMethod: 'PER_MINUTE',
      defaultAmount: 500,
      sortOrder: 10,
      isTaxable: false,
      isSystem: false,
    },
    {
      code: 'ABSENT_PENALTY',
      name: 'Potongan Alpha',
      description: 'Potongan tidak hadir per hari',
      type: 'DEDUCTION',
      calcMethod: 'PER_DAY',
      defaultAmount: 100000,
      sortOrder: 11,
      isTaxable: false,
      isSystem: false,
    },
    {
      code: 'BPJS_KES',
      name: 'BPJS Kesehatan',
      description: 'Iuran BPJS Kesehatan (1%)',
      type: 'DEDUCTION',
      calcMethod: 'PERCENTAGE',
      defaultAmount: 1,
      sortOrder: 12,
      isTaxable: false,
      isSystem: true,
    },
    {
      code: 'BPJS_TK',
      name: 'BPJS Ketenagakerjaan',
      description: 'Iuran BPJS Ketenagakerjaan (2%)',
      type: 'DEDUCTION',
      calcMethod: 'PERCENTAGE',
      defaultAmount: 2,
      sortOrder: 13,
      isTaxable: false,
      isSystem: true,
    },
    {
      code: 'TAX',
      name: 'Pajak Penghasilan',
      description: 'PPh 21 (5%)',
      type: 'DEDUCTION',
      calcMethod: 'PERCENTAGE',
      defaultAmount: 5,
      sortOrder: 14,
      isTaxable: false,
      isSystem: true,
    },
    {
      code: 'LOAN',
      name: 'Pinjaman Karyawan',
      description: 'Potongan cicilan pinjaman',
      type: 'DEDUCTION',
      calcMethod: 'FIXED',
      defaultAmount: null,
      sortOrder: 15,
      isTaxable: false,
      isSystem: false,
    },
  ]

  for (const comp of components) {
    await prisma.salaryComponent.upsert({
      where: { code: comp.code },
      update: comp,
      create: comp,
    })
  }

  console.log(`✅ Seeded ${components.length} salary components`)
}

async function seedPayrollSettings() {
  console.log('🌱 Seeding payroll settings...')

  const settings = [
    {
      key: 'payroll.enabled',
      value: true,
      category: 'payroll',
      label: 'Aktifkan Modul Payroll',
      description: 'Jika nonaktif, modul payroll tidak bisa diakses',
      type: 'boolean',
      isSystem: true,
    },
    {
      key: 'payroll.period_start_day',
      value: 26,
      category: 'payroll',
      label: 'Tanggal Mulai Periode',
      description: 'Tanggal mulai periode payroll (1-31)',
      type: 'number',
      isSystem: true,
    },
    {
      key: 'payroll.period_end_day',
      value: 25,
      category: 'payroll',
      label: 'Tanggal Selesai Periode',
      description: 'Tanggal selesai periode payroll (1-31)',
      type: 'number',
      isSystem: true,
    },
    {
      key: 'payroll.working_days_per_month',
      value: 26,
      category: 'payroll',
      label: 'Hari Kerja per Bulan',
      description: 'Jumlah hari kerja standar per bulan',
      type: 'number',
      isSystem: true,
    },
    {
      key: 'payroll.late_penalty_per_minute',
      value: 500,
      category: 'payroll',
      label: 'Denda Telat per Menit',
      description: 'Nominal potongan per menit keterlambatan',
      type: 'number',
      isSystem: true,
    },
    {
      key: 'payroll.absent_penalty_per_day',
      value: 100000,
      category: 'payroll',
      label: 'Denda Alpha per Hari',
      description: 'Nominal potongan per hari tidak hadir',
      type: 'number',
      isSystem: true,
    },
    {
      key: 'payroll.overtime_per_hour',
      value: 20000,
      category: 'payroll',
      label: 'Upah Lembur per Jam',
      description: 'Nominal upah lembur per jam',
      type: 'number',
      isSystem: true,
    },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    })
  }

  console.log(`✅ Seeded ${settings.length} payroll settings`)
}

async function main() {
  console.log('🚀 Starting seed...')

  await seedSalaryComponents()
  await seedPayrollSettings()

  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })