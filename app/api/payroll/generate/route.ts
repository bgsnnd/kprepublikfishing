import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { generatePayrollSchema } from '@/lib/validation/payroll'
import { formatZodError } from '@/lib/validation/auth'
import {
  calculatePayroll,
  buildPayrollPeriod,
} from '@/lib/payroll/calculator'
import { created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'

// ============================================================
// POST /api/payroll/generate
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const body = await parseJsonBody(req)

    const parsed = generatePayrollSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // ✅ Tentukan periode (dengan date opsional)
    const period = await buildPayrollPeriod(
      data.periodMonth,
      data.periodYear,
      data.date || undefined,
    )

    // Cari user
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(data.userIds && data.userIds.length > 0
          ? { id: { in: data.userIds } }
          : {}),
      },
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
      orderBy: { name: 'asc' },
    })

    if (users.length === 0) {
      throw new ValidationError('Tidak ada user yang bisa di-generate', {
        userIds: ['Pilih minimal 1 user'],
      })
    }

    const results: {
      userId: string
      username: string
      name: string
      status: 'created' | 'updated' | 'skipped' | 'error'
      netSalary?: number
      reason?: string
    }[] = []

    for (const user of users) {
      try {
        const existing = await prisma.payroll.findUnique({
          where: {
            userId_periodMonth_periodYear: {
              userId: user.id,
              periodMonth: data.periodMonth,
              periodYear: data.periodYear,
            },
          },
          select: { id: true, status: true },
        })

        if (existing && existing.status !== 'DRAFT') {
          results.push({
            userId: user.id,
            username: user.username,
            name: user.name,
            status: 'skipped',
            reason: `Sudah ada payroll status ${existing.status}`,
          })
          continue
        }

        const breakdown = await calculatePayroll(user.id, period)

        if (breakdown.items.length === 0) {
          results.push({
            userId: user.id,
            username: user.username,
            name: user.name,
            status: 'skipped',
            reason: 'Tidak ada komponen gaji',
          })
          continue
        }

        await prisma.$transaction(async (tx) => {
          if (existing) {
            await tx.payrollItem.deleteMany({
              where: { payrollId: existing.id },
            })
          }

          const payroll = await tx.payroll.upsert({
            where: {
              userId_periodMonth_periodYear: {
                userId: user.id,
                periodMonth: data.periodMonth,
                periodYear: data.periodYear,
              },
            },
            update: {
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              workingDays: breakdown.workingDays,
              presentDays: breakdown.presentDays,
              absentDays: breakdown.absentDays,
              lateDays: breakdown.lateDays,
              totalLateMinutes: breakdown.totalLateMinutes,
              totalWorkMinutes: breakdown.totalWorkMinutes,
              grossEarning: breakdown.grossEarning,
              totalDeduction: breakdown.totalDeduction,
              netSalary: breakdown.netSalary,
              updatedAt: new Date(),
            },
            create: {
              userId: user.id,
              periodMonth: data.periodMonth,
              periodYear: data.periodYear,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              workingDays: breakdown.workingDays,
              presentDays: breakdown.presentDays,
              absentDays: breakdown.absentDays,
              lateDays: breakdown.lateDays,
              totalLateMinutes: breakdown.totalLateMinutes,
              totalWorkMinutes: breakdown.totalWorkMinutes,
              grossEarning: breakdown.grossEarning,
              totalDeduction: breakdown.totalDeduction,
              netSalary: breakdown.netSalary,
              status: 'DRAFT',
            },
          })

          await tx.payrollItem.createMany({
            data: breakdown.items.map((item) => ({
              payrollId: payroll.id,
              componentId: item.componentId,
              componentCode: item.componentCode,
              componentName: item.componentName,
              componentType: item.componentType,
              calcMethod: item.calcMethod,
              baseAmount: item.baseAmount,
              quantity: item.quantity,
              finalAmount: item.finalAmount,
              notes: item.notes,
            })),
          })
        })

        results.push({
          userId: user.id,
          username: user.username,
          name: user.name,
          status: existing ? 'updated' : 'created',
          netSalary: breakdown.netSalary,
        })
      } catch (err) {
        console.error(`Error generating payroll for ${user.username}:`, err)
        results.push({
          userId: user.id,
          username: user.username,
          name: user.name,
          status: 'error',
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const createdCount = results.filter((r) => r.status === 'created').length
    const updatedCount = results.filter((r) => r.status === 'updated').length
    const skippedCount = results.filter((r) => r.status === 'skipped').length
    const erroredCount = results.filter((r) => r.status === 'error').length

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Payroll',
      after: {
        generate: true,
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
        date: data.date,
        total: users.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errored: erroredCount,
      },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return created({
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      date: data.date,
      total: users.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errored: erroredCount,
      results,
      message: `${createdCount} payroll dibuat${updatedCount > 0 ? `, ${updatedCount} diupdate` : ''}${skippedCount > 0 ? `, ${skippedCount} dilewati` : ''}${erroredCount > 0 ? `, ${erroredCount} error` : ''}`,
    })
  }, { module: 'payroll.generate' })
}