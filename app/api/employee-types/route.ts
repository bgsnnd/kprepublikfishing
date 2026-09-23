import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import {
  createEmployeeTypeSchema,
  listEmployeeTypesQuerySchema,
} from '@/lib/validation/employee-type'
import { listEmployeeTypes } from '@/lib/employee-types/queries'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/employee-types
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('user.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listEmployeeTypesQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listEmployeeTypes(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'employee-types.list' })
}

// ============================================================
// POST /api/employee-types
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const body = await parseJsonBody(req)

    const parsed = createEmployeeTypeSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const existing = await prisma.employeeType.findUnique({
      where: { code: data.code },
      select: { code: true },
    })

    if (existing) {
      throw new ConflictError('Kode tipe karyawan sudah dipakai')
    }

    const et = await prisma.employeeType.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'EmployeeType',
      entityId: et.id,
      after: {
        code: et.code,
        name: et.name,
        description: et.description,
      },
      module: 'master',
      severity: 'INFO',
      context: auditCtx,
    })

    return created({
      code: et.code,
      name: et.name,
      description: et.description,
      isActive: et.isActive,
      createdAt: et.createdAt,
    })
  }, { module: 'employee-types.create' })
}