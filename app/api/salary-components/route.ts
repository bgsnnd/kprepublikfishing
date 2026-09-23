import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import {
  createSalaryComponentSchema,
  listSalaryComponentsQuerySchema,
} from '@/lib/validation/salary-component'
import { listSalaryComponents } from '@/lib/salary-components/queries'
import { formatZodError } from '@/lib/validation/auth'
import { ok, created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/salary-components
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('payroll.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listSalaryComponentsQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listSalaryComponents(parsed.data)
    return ok(result.items, {
      meta: { total: result.total },
    })
  }, { module: 'salary-components.list' })
}

// ============================================================
// POST /api/salary-components
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const body = await parseJsonBody(req)

    const parsed = createSalaryComponentSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cek duplikat code
    const existing = await prisma.salaryComponent.findUnique({
      where: { code: data.code },
      select: { id: true, name: true },
    })

    if (existing) {
      throw new ConflictError(
        `Kode "${data.code}" sudah dipakai oleh komponen "${existing.name}"`,
      )
    }

    const component = await prisma.salaryComponent.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        type: data.type,
        calcMethod: data.calcMethod,
        defaultAmount: data.defaultAmount ?? null,
        sortOrder: data.sortOrder,
        isTaxable: data.isTaxable,
        isSystem: false,
        isActive: true,
        createdById: session.userId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        calcMethod: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'SalaryComponent',
      entityId: component.id,
      after: {
        code: data.code,
        name: data.name,
        type: data.type,
        calcMethod: data.calcMethod,
      },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(component)
  }, { module: 'salary-components.create' })
}