import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings/queries'

// ============================================================
// Types
// ============================================================

export type PayrollPeriod = {
  periodStart: Date
  periodEnd: Date
  periodMonth: number
  periodYear: number
}

export type PayrollBreakdownItem = {
  componentId: string
  componentCode: string
  componentName: string
  componentType: 'EARNING' | 'DEDUCTION'
  calcMethod: string
  baseAmount: number
  quantity: number | null
  finalAmount: number
  notes: string | null
}

export type PayrollBreakdown = {
  items: PayrollBreakdownItem[]
  grossEarning: number
  totalDeduction: number
  netSalary: number
  workingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  totalLateMinutes: number
  totalWorkMinutes: number
  totalSessions: number
  basicSalary: number
  totalOvertimeHours: number
}

// ============================================================
// Helper: Setting with fallback
// ============================================================

async function getSettingWithFallback<T>(
  keys: string[],
  defaultValue: T,
): Promise<T> {
  for (const key of keys) {
    const value = await getSetting<T>(key)
    if (value !== null && value !== undefined) {
      return value
    }
  }
  return defaultValue
}

// ============================================================
// Helper: End of day
// ============================================================

/**
 * Convert Date → end of day (23:59:59.999 UTC)
 * Biar filter `effectiveFrom <= periodEndEOD` gak gagal
 * karena effectiveFrom ada jam.
 */
function toEndOfDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

/**
 * Convert Date → start of day (00:00:00.000 UTC)
 */
function toStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ============================================================
// Main: Calculate Payroll
// ============================================================

export async function calculatePayroll(
  userId: string,
  period: PayrollPeriod,
): Promise<PayrollBreakdown> {
  const { periodStart, periodEnd } = period

  // ✅ Period start & end of day
  const periodStartSOD = toStartOfDay(periodStart)
  const periodEndEOD = toEndOfDay(periodEnd)

  // ============================================================
  // 1. Ambil data absensi
  // ============================================================
  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      workDate: { gte: periodStartSOD, lte: periodEndEOD },
    },
    select: {
      id: true,
      workDate: true,
      checkIn: true,
      checkOut: true,
      status: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      workDurationMinutes: true,
    },
    orderBy: { workDate: 'asc' },
  })

  // ============================================================
  // 2. Ambil shift (buat deteksi alpha)
  // ============================================================
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      shiftDate: { gte: periodStartSOD, lte: periodEndEOD },
      status: { not: 'CANCELLED' },
    },
    select: { id: true, shiftDate: true },
    orderBy: { shiftDate: 'asc' },
  })

  // ============================================================
  // 3. Ambil sesi caddy
  // ============================================================
  const caddySessions = await prisma.caddySession.findMany({
    where: {
      caddyId: userId,
      sessionDate: { gte: periodStartSOD, lte: periodEndEOD },
    },
    select: { id: true, fee: true, tip: true },
  })

  // ============================================================
  // 4. Hitung agregat absensi
  // ============================================================
  const uniqueWorkDates = new Set(
    attendances.map((a) => a.workDate.toISOString().slice(0, 10)),
  )
  const presentDays = uniqueWorkDates.size

  const lateAttendances = attendances.filter((a) => a.lateMinutes > 0)
  const lateDays = new Set(
    lateAttendances.map((a) => a.workDate.toISOString().slice(0, 10)),
  ).size
  const totalLateMinutes = attendances.reduce(
    (sum, a) => sum + a.lateMinutes,
    0,
  )
  const totalWorkMinutes = attendances.reduce(
    (sum, a) => sum + (a.workDurationMinutes ?? 0),
    0,
  )

  const uniqueShiftDates = new Set(
    shifts.map((s) => s.shiftDate.toISOString().slice(0, 10)),
  )
  const workingDays = uniqueShiftDates.size

  const absentShiftDates = new Set<string>()
  for (const shift of shifts) {
    const dateStr = shift.shiftDate.toISOString().slice(0, 10)
    if (!uniqueWorkDates.has(dateStr)) absentShiftDates.add(dateStr)
  }
  const absentDays = absentShiftDates.size
  const totalSessions = caddySessions.length
  const totalOvertimeMinutes = 0

  // ============================================================
  // 5. Ambil config gaji
  // ============================================================
  const userRole = await prisma.userRole.findFirst({
    where: { userId },
    select: { roleId: true },
  })
  const roleId = userRole?.roleId ?? null

  const [userConfigs, roleConfigs, allComponents] = await Promise.all([
    prisma.userSalaryConfig.findMany({
      where: {
        userId,
        // ✅ Filter pake EOD
        effectiveFrom: { lte: periodEndEOD },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStartSOD } }],
      },
      select: { componentId: true, amount: true, effectiveFrom: true },
      orderBy: { effectiveFrom: 'desc' },
    }),
    roleId
      ? prisma.roleSalaryConfig.findMany({
          where: {
            roleId,
            // ✅ Filter pake EOD
            effectiveFrom: { lte: periodEndEOD },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: periodStartSOD } },
            ],
          },
          select: { componentId: true, amount: true, effectiveFrom: true },
          orderBy: { effectiveFrom: 'desc' },
        })
      : Promise.resolve([]),
    prisma.salaryComponent.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  const userConfigMap = new Map(
    userConfigs.map((c) => [c.componentId, c.amount]),
  )
  const roleConfigMap = new Map(
    roleConfigs.map((c) => [c.componentId, c.amount]),
  )

  // ============================================================
  // 6. Ambil setting global (CUMA buat overtime_rate)
  // ============================================================
  const overtimeRate = await getSettingWithFallback<number>(
    ['payroll.overtime_rate'],
    1.0,
  )

  // ============================================================
  // 7. Mapping quantity per calcMethod
  // ============================================================
  function getQuantityForComponent(comp: {
    type: string
    calcMethod: string
  }): { quantity: number; label: string } {
    const isEarning = comp.type === 'EARNING'

    switch (comp.calcMethod) {
      case 'FIXED':
        return { quantity: 1, label: '1x' }

      case 'PER_DAY':
        return isEarning
          ? { quantity: presentDays, label: `${presentDays} hari hadir` }
          : { quantity: absentDays, label: `${absentDays} hari alpha` }

      case 'PER_HOUR': {
        if (isEarning) {
          const hours = Math.round((totalWorkMinutes / 60) * 100) / 100
          return { quantity: hours, label: `${hours} jam kerja` }
        }
        const hours = Math.round((totalOvertimeMinutes / 60) * 100) / 100
        return { quantity: hours, label: `${hours} jam` }
      }

      case 'PER_MINUTE':
        return isEarning
          ? {
              quantity: totalWorkMinutes,
              label: `${totalWorkMinutes} menit kerja`,
            }
          : {
              quantity: totalLateMinutes,
              label: `${totalLateMinutes} menit telat`,
            }

      case 'PER_SESSION':
        return {
          quantity: totalSessions,
          label: `${totalSessions} sesi`,
        }

      case 'PERCENTAGE':
        return { quantity: 1, label: '%' }

      default:
        return { quantity: 1, label: '1x' }
    }
  }

  // ============================================================
  // 8. Hitung gaji pokok dulu (buat PERCENTAGE)
  // ============================================================
  const basicSalaryComponent = allComponents.find(
    (c) => c.calcMethod === 'FIXED' && c.type === 'EARNING',
  )
  const basicSalaryAmount = basicSalaryComponent
    ? (userConfigMap.get(basicSalaryComponent.id) ??
       roleConfigMap.get(basicSalaryComponent.id) ??
       basicSalaryComponent.defaultAmount ??
       0)
    : 0

  // ============================================================
  // 9. Loop semua komponen
  // ============================================================
  const items: PayrollBreakdownItem[] = []

  for (const comp of allComponents) {
    // Prioritas: user > role > default
    const configuredAmount: number | null =
      userConfigMap.get(comp.id) ??
      roleConfigMap.get(comp.id) ??
      comp.defaultAmount ??
      null

    if (configuredAmount === null || configuredAmount === 0) continue

    const { quantity, label } = getQuantityForComponent(comp)

    let finalAmount = 0
    let notes: string | null = null

    if (comp.calcMethod === 'FIXED') {
      finalAmount = configuredAmount
      notes = null
    } else if (comp.calcMethod === 'PERCENTAGE') {
      finalAmount = Math.round((configuredAmount / 100) * basicSalaryAmount)
      notes = `${configuredAmount}% × ${basicSalaryAmount.toLocaleString('id-ID')}`
    } else if (comp.calcMethod === 'PER_HOUR' && comp.type === 'EARNING') {
      const effectiveRate = Math.round(configuredAmount * overtimeRate)
      finalAmount = Math.round(effectiveRate * quantity)
      notes = `${quantity} jam × ${effectiveRate.toLocaleString('id-ID')}${
        overtimeRate !== 1 ? ` (rate ${overtimeRate}x)` : ''
      }`
    } else {
      finalAmount = Math.round(configuredAmount * quantity)
      notes = `${label} × ${configuredAmount.toLocaleString('id-ID')}`
    }

    if (finalAmount === 0) continue

    items.push({
      componentId: comp.id,
      componentCode: comp.code,
      componentName: comp.name,
      componentType: comp.type as 'EARNING' | 'DEDUCTION',
      calcMethod: comp.calcMethod,
      baseAmount: configuredAmount,
      quantity,
      finalAmount,
      notes,
    })
  }

  // ============================================================
  // 10. Total
  // ============================================================
  const grossEarning = items
    .filter((i) => i.componentType === 'EARNING')
    .reduce((sum, i) => sum + i.finalAmount, 0)

  const totalDeduction = items
    .filter((i) => i.componentType === 'DEDUCTION')
    .reduce((sum, i) => sum + i.finalAmount, 0)

  const netSalary = Math.max(0, grossEarning - totalDeduction)

  return {
    items,
    grossEarning,
    totalDeduction,
    netSalary,
    workingDays,
    presentDays,
    absentDays,
    lateDays,
    totalLateMinutes,
    totalWorkMinutes,
    totalSessions,
    basicSalary: basicSalaryAmount,
    totalOvertimeHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
  }
}

// ============================================================
// Helper: Build payroll period
// ============================================================

export async function buildPayrollPeriod(
  month: number,
  year: number,
  date?: string,
): Promise<PayrollPeriod> {
  const periodType = await getSettingWithFallback<string>(
    ['payroll.period_type'],
    'MONTHLY_CUSTOM',
  )
  const startDay = await getSettingWithFallback<number>(
    ['payroll.period_start_day'],
    26,
  )
  const endDay = await getSettingWithFallback<number>(
    ['payroll.period_end_day'],
    25,
  )

  let periodStart: Date
  let periodEnd: Date

  switch (periodType) {
    case 'MONTHLY_FULL': {
      periodStart = new Date(Date.UTC(year, month - 1, 1))
      periodEnd = new Date(Date.UTC(year, month, 0))
      break
    }

    case 'WEEKLY': {
      const refDate = date
        ? (() => {
            const [y, m, d] = date.split('-').map(Number)
            return new Date(Date.UTC(y, m - 1, d))
          })()
        : new Date(Date.UTC(year, month - 1, 1))

      const dayOfWeek = refDate.getUTCDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

      periodStart = new Date(refDate)
      periodStart.setUTCDate(refDate.getUTCDate() + diffToMonday)
      periodEnd = new Date(periodStart)
      periodEnd.setUTCDate(periodStart.getUTCDate() + 6)
      break
    }

    case 'DAILY': {
      if (date) {
        const [y, m, d] = date.split('-').map(Number)
        periodStart = new Date(Date.UTC(y, m - 1, d))
      } else {
        periodStart = new Date(Date.UTC(year, month - 1, 1))
      }
      periodEnd = new Date(periodStart)
      break
    }

    case 'MONTHLY_CUSTOM':
    default: {
      periodEnd = new Date(Date.UTC(year, month - 1, endDay))
      periodStart = new Date(Date.UTC(year, month - 2, startDay))
      break
    }
  }

  return {
    periodStart,
    periodEnd,
    periodMonth: month,
    periodYear: year,
  }
}