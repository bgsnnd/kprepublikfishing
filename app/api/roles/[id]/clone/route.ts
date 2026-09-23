import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { cloneRoleSchema } from '@/lib/validation/role'
import { formatZodError } from '@/lib/validation/auth'
import { created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('role.manage')
    const { id: sourceId } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = cloneRoleSchema.safeParse({ ...(body as object), sourceId })
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const { code, name } = parsed.data

    const source = await prisma.role.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        rolePermissions: { select: { permissionId: true } },
      },
    })

    if (!source) throw new NotFoundError('Role sumber tidak ditemukan')

    const existing = await prisma.role.findUnique({
      where: { code },
      select: { id: true },
    })

    if (existing) throw new ConflictError('Kode role sudah dipakai')

    const permissionIds = source.rolePermissions.map((rp) => rp.permissionId)

    const role = await prisma.role.create({
      data: {
        code,
        name,
        description: `Clone dari ${source.name}`,
        isSystem: false,
        createdById: session.userId,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
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
        clonedFrom: source.code,
        permissionCount: permissionIds.length,
      },
      module: 'rbac',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(role)
  }, { module: 'roles.clone' })
}