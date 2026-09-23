import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth/context'
import { ok, withErrorHandler } from '@/lib/api/response'

export async function GET() {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')

    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        username: true,
        name: true,
        employeeType: { select: { name: true } },
      },
    })

    return ok(users)
  }, { module: 'users.options' })
}