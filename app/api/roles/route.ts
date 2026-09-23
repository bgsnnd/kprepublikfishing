import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { createRoleSchema } from '@/lib/validation/role'
import { listRoles, listPermissionsGrouped } from '@/lib/roles/queries'
import { formatZodError } from '@/lib/validation/auth'
import { ok, created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/roles — list roles + permission grouped
// ============================================================

export async function GET() {
  return withErrorHandler(async () => {
    await requirePermission('role.read')

    const [roles, permissionGroups] = await Promise.all([
      listRoles(),
      listPermissionsGrouped(),
    ])

    return ok({ roles, permissionGroups })
  }, { module: 'roles.list' })
}

// ============================================================
// POST /api/roles — create role
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('role.manage')
    const body = await parseJsonBody(req)

    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cek duplikat code
    const existing = await prisma.role.findUnique({
      where: { code: data.code },
      select: { id: true, code: true },
    })

    if (existing) {
      throw new ConflictError('Kode role sudah dipakai')
    }

    // Validasi permission IDs
    const validPermissions = await prisma.permission.findMany({
      where: { id: { in: data.permissionIds }, isActive: true },
      select: { id: true },
    })

    const validIds = validPermissions.map((p) => p.id)

    const role = await prisma.role.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        isSystem: false,
        createdById: session.userId,
        rolePermissions: {
          create: validIds.map((permissionId) => ({
            permissionId,
            grantedBy: session.userId,
          })),
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Role',
      entityId: role.id,
      after: {
        code: role.code,
        name: role.name,
        description: role.description,
        permissionCount: validIds.length,
      },
      module: 'rbac',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(role)
  }, { module: 'roles.create' })
}