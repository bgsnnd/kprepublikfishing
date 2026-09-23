import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('💵 Seeding Role Salary Config...\n')

  // ============================================================
  // Config per role
  // ============================================================
  const configs: Record<string, { code: string; amount: number }[]> = {
    KARYAWAN: [
      { code: 'BASIC_SALARY', amount: 2500000 },
      { code: 'TRANSPORT', amount: 15000 },
      { code: 'MEAL_ALLOWANCE', amount: 20000 },
    ],
    CADDY: [
      { code: 'PER_SESSION_FEE', amount: 50000 },
      { code: 'MEAL_ALLOWANCE', amount: 20000 },
    ],
    KASIR_KANTIN: [
      { code: 'BASIC_SALARY', amount: 2800000 },
      { code: 'TRANSPORT', amount: 15000 },
      { code: 'MEAL_ALLOWANCE', amount: 20000 },
    ],
    KASIR_PANCING: [
      { code: 'BASIC_SALARY', amount: 2800000 },
      { code: 'TRANSPORT', amount: 15000 },
      { code: 'MEAL_ALLOWANCE', amount: 20000 },
    ],
  }

  for (const [roleCode, items] of Object.entries(configs)) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } })
    if (!role) {
      console.log(`⚠️  Role ${roleCode} gak ada, skip`)
      continue
    }

    console.log(`👥 ${roleCode}:`)

    for (const item of items) {
      const comp = await prisma.salaryComponent.findUnique({
        where: { code: item.code },
      })
      if (!comp) {
        console.log(`   ⚠️  Component ${item.code} gak ada, skip`)
        continue
      }

      // Cek apakah udah ada config aktif
      const existing = await prisma.roleSalaryConfig.findFirst({
        where: {
          roleId: role.id,
          componentId: comp.id,
          effectiveTo: null,
        },
      })

      if (existing) {
        console.log(
          `   ℹ️  ${item.code} udah ada (${existing.amount.toLocaleString('id-ID')}), skip`,
        )
        continue
      }

      await prisma.roleSalaryConfig.create({
        data: {
          roleId: role.id,
          componentId: comp.id,
          amount: item.amount,
        },
      })

      console.log(
        `   ✅ ${item.code} = Rp ${item.amount.toLocaleString('id-ID')}`,
      )
    }

    console.log()
  }

  console.log('✅ Selesai!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())