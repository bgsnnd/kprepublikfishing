import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { upsertUserSalaryConfigSchema } from '@/lib/validation/salary-config'
import { formatZodError } from '@/lib/validation/auth'
import {
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'

// ============================================================
// POST /api/salary-config/users — Upsert config user
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const body = await parseJsonBody(req)

    const parsed = upsertUserSalaryConfigSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const [user, component] = await Promise.all([
      prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, username: true, name: true },
      }),
      prisma.salaryComponent.findUnique({
        where: { id: data.componentId },
        select: { id: true, code: true, name: true },
      }),
    ])

    if (!user) throw new ValidationError('User tidak ditemukan')
    if (!component) throw new ValidationError('Komponen tidak ditemukan')

    const existing = await prisma.userSalaryConfig.findFirst({
      where: {
        userId: user.id,
        componentId: component.id,
        effectiveTo: null,
      },
      select: { id: true },
    })

    let result
    let action: 'CREATE' | 'UPDATE'

    if (existing) {
      result = await prisma.userSalaryConfig.update({
        where: { id: existing.id },
        data: {
          amount: data.amount,
          reason: data.reason || null,
        },
        select: { id: true, amount: true },
      })
      action = 'UPDATE'
    } else {
      result = await prisma.userSalaryConfig.create({
        data: {
          userId: user.id,
          componentId: component.id,
          amount: data.amount,
          reason: data.reason || null,
        },
        select: { id: true, amount: true },
      })
      action = 'CREATE'
    }

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action,
      entity: 'UserSalaryConfig',
      entityId: result.id,
      after: {
        username: user.username,
        componentCode: component.code,
        amount: data.amount,
        reason: data.reason,
      },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return created({
      id: result.id,
      amount: result.amount,
      message: `Override ${user.name} → ${component.name} ${action === 'CREATE' ? 'ditambahkan' : 'diupdate'}`,
    })
  }, { module: 'salary-config.user-upsert' })
}