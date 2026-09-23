import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { upsertRoleSalaryConfigSchema } from '@/lib/validation/salary-config'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// POST /api/salary-config — Upsert config role
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const body = await parseJsonBody(req)

    const parsed = upsertRoleSalaryConfigSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cek role & component
    const [role, component] = await Promise.all([
      prisma.role.findUnique({
        where: { id: data.roleId },
        select: { id: true, code: true, name: true },
      }),
      prisma.salaryComponent.findUnique({
        where: { id: data.componentId },
        select: { id: true, code: true, name: true, type: true },
      }),
    ])

    if (!role) throw new ValidationError('Role tidak ditemukan')
    if (!component) throw new ValidationError('Komponen tidak ditemukan')

    // Cek apakah sudah ada config aktif
    const existing = await prisma.roleSalaryConfig.findFirst({
      where: {
        roleId: role.id,
        componentId: component.id,
        effectiveTo: null,
      },
      select: { id: true, amount: true },
    })

    let result
    let action: 'CREATE' | 'UPDATE'

    if (existing) {
      // Update
      result = await prisma.roleSalaryConfig.update({
        where: { id: existing.id },
        data: { amount: data.amount },
        select: { id: true, amount: true },
      })
      action = 'UPDATE'
    } else {
      // Create
      result = await prisma.roleSalaryConfig.create({
        data: {
          roleId: role.id,
          componentId: component.id,
          amount: data.amount,
        },
        select: { id: true, amount: true },
      })
      action = 'CREATE'
    }

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action,
      entity: 'RoleSalaryConfig',
      entityId: result.id,
      after: {
        roleCode: role.code,
        componentCode: component.code,
        amount: data.amount,
      },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return created({
      id: result.id,
      amount: result.amount,
      message: `Config ${role.name} → ${component.name} ${action === 'CREATE' ? 'ditambahkan' : 'diupdate'}`,
    })
  }, { module: 'salary-config.upsert' })
}