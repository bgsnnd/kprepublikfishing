import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

// ============================================================
// Schema
// ============================================================

const updatePayrollSettingsSchema = z.object({
  periodType: z.enum([
    'MONTHLY_FULL',
    'MONTHLY_CUSTOM',
    'WEEKLY',
    'DAILY',
  ]),
  periodStartDay: z.coerce.number().int().min(1).max(31),
  periodEndDay: z.coerce.number().int().min(1).max(31),
  cutoffDay: z.coerce.number().int().min(1).max(31),
  payday: z.coerce.number().int().min(1).max(31),
  workingDaysPerMonth: z.coerce.number().int().min(1).max(31),
  overtimePerHour: z.coerce.number().int().min(0),
  overtimeRate: z.coerce.number().min(1).max(5),
  latePenaltyPerMinute: z.coerce.number().int().min(0),
  absentPenaltyPerDay: z.coerce.number().int().min(0),
  bpjsPercent: z.coerce.number().min(0).max(100),
  taxPercent: z.coerce.number().min(0).max(100),
  enabled: z.boolean(),
})

// ============================================================
// GET /api/settings/payroll
// ============================================================

export async function GET() {
  return withErrorHandler(async () => {
    await requirePermission('payroll.read')

    const settings = await prisma.setting.findMany({
      where: { category: 'payroll', isActive: true },
    })

    const map: Record<string, unknown> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }

    return ok({
      periodType: (map['payroll.period_type'] as string) ?? 'MONTHLY_CUSTOM',
      periodStartDay: (map['payroll.period_start_day'] as number) ?? 26,
      periodEndDay: (map['payroll.period_end_day'] as number) ?? 25,
      cutoffDay: (map['payroll.cutoff_day'] as number) ?? 25,
      payday: (map['payroll.payday'] as number) ?? 1,
      workingDaysPerMonth:
        (map['payroll.working_days_per_month'] as number) ?? 26,
      overtimePerHour: (map['payroll.overtime_per_hour'] as number) ?? 20000,
      overtimeRate: (map['payroll.overtime_rate'] as number) ?? 1.5,
      latePenaltyPerMinute:
        (map['payroll.late_penalty_per_minute'] as number) ?? 500,
      absentPenaltyPerDay:
        (map['payroll.absent_penalty_per_day'] as number) ?? 100000,
      bpjsPercent: (map['payroll.bpjs_percent'] as number) ?? 2,
      taxPercent: (map['payroll.tax_percent'] as number) ?? 5,
      enabled: (map['payroll.enabled'] as boolean) ?? true,
    })
  }, { module: 'settings.payroll' })
}

// ============================================================
// PATCH /api/settings/payroll
// ============================================================

export async function PATCH(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const body = await parseJsonBody(req)

    const parsed = updatePayrollSettingsSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const updates = [
      { key: 'payroll.period_type', value: data.periodType },
      { key: 'payroll.period_start_day', value: data.periodStartDay },
      { key: 'payroll.period_end_day', value: data.periodEndDay },
      { key: 'payroll.cutoff_day', value: data.cutoffDay },
      { key: 'payroll.payday', value: data.payday },
      {
        key: 'payroll.working_days_per_month',
        value: data.workingDaysPerMonth,
      },
      { key: 'payroll.overtime_per_hour', value: data.overtimePerHour },
      { key: 'payroll.overtime_rate', value: data.overtimeRate },
      {
        key: 'payroll.late_penalty_per_minute',
        value: data.latePenaltyPerMinute,
      },
      {
        key: 'payroll.absent_penalty_per_day',
        value: data.absentPenaltyPerDay,
      },
      { key: 'payroll.bpjs_percent', value: data.bpjsPercent },
      { key: 'payroll.tax_percent', value: data.taxPercent },
      { key: 'payroll.enabled', value: data.enabled },
    ]

    for (const u of updates) {
      await prisma.setting.upsert({
        where: { key: u.key },
        update: { value: u.value as never },
        create: {
          key: u.key,
          value: u.value as never,
          category: 'payroll',
          label: u.key,
          type:
            typeof u.value === 'number'
              ? 'number'
              : typeof u.value === 'boolean'
                ? 'boolean'
                : 'string',
          isSystem: true,
          isActive: true,
        },
      })
    }

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Setting',
      after: { category: 'payroll', ...data },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({ message: 'Setting payroll disimpan' })
  }, { module: 'settings.payroll-update' })
}