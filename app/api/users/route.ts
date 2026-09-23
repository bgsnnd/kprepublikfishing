import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { hashPassword } from '@/lib/auth/password'
import { writeAudit } from '@/lib/audit/log'
import { createUserSchema, listUsersQuerySchema } from '@/lib/validation/user'
import { listUsers } from '@/lib/users/queries'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('user.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listUsersQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listUsers(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'users.list' })
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const body = await parseJsonBody(req)

    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
      select: { email: true, username: true },
    })

    if (existing) {
      throw new ConflictError(
        existing.email === data.email
          ? 'Email sudah terdaftar'
          : 'Username sudah dipakai',
      )
    }

    // Resolve employee type
    let employeeTypeId: string | null = null
    if (data.employeeTypeCode) {
      const et = await prisma.employeeType.findUnique({
        where: { code: data.employeeTypeCode },
        select: { id: true },
      })
      employeeTypeId = et?.id ?? null
    }

    // Resolve roles
    const roles = await prisma.role.findMany({
      where: { code: { in: data.roleCodes }, isActive: true },
      select: { id: true, code: true },
    })

    if (roles.length !== data.roleCodes.length) {
      throw new ValidationError('Ada role yang tidak valid', {
        roleCodes: ['Role tidak ditemukan atau tidak aktif'],
      })
    }

    const passwordHash = await hashPassword(data.password)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        passwordHash,
        phone: data.phone || null,
        employeeTypeId,
        createdById: session.userId,
        userRoles: {
          create: roles.map((r) => ({
            roleId: r.id,
            assignedBy: session.userId,
          })),
        },
      },
      select: {
        username: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        employeeType: { select: { code: true, name: true } },
        userRoles: { select: { role: { select: { code: true, name: true } } } },
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'User',
      after: {
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        employeeTypeCode: user.employeeType?.code ?? null,
        roleCodes: user.userRoles.map((ur) => ur.role.code),
      },
      module: 'rbac',
      severity: 'INFO',
      context: auditCtx,
    })

    return created({
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    })
  }, { module: 'users.create' })
}