import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import {
  getAllSettingsGrouped,
  updateSettingsBulk,
} from '@/lib/settings/queries'
import { updateSettingsSchema } from '@/lib/validation/setting'
import { formatZodError } from '@/lib/validation/auth'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

// ============================================================
// GET /api/settings
// ============================================================

export async function GET() {
  return withErrorHandler(async () => {
    await requirePermission('system.settings')

    const grouped = await getAllSettingsGrouped()
    return ok(grouped)
  }, { module: 'settings.list' })
}

// ============================================================
// PATCH /api/settings — bulk update
// ============================================================

export async function PATCH(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('system.settings')
    const body = await parseJsonBody(req)

    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const { settings } = parsed.data

    // Ambil nilai sebelum untuk audit
    const before = await prisma.setting.findMany({
      where: { key: { in: settings.map((s) => s.key) } },
      select: { key: true, value: true, label: true },
    })

    // Update bulk
    await updateSettingsBulk({
      settings,
      updatedById: session.userId,
    })

    // Audit log
    const auditCtx = await buildAuditContext(session)

    for (const s of settings) {
      const oldValue = before.find((b) => b.key === s.key)

      if (JSON.stringify(oldValue?.value) !== JSON.stringify(s.value)) {
        await writeAudit({
          action: 'UPDATE',
          entity: 'Setting',
          entityId: s.key,
          before: { value: oldValue?.value },
          after: { value: s.value },
          module: 'settings',
          severity: 'WARNING',
          context: auditCtx,
        })
      }
    }

    return ok({ message: 'Pengaturan berhasil disimpan' })
  }, { module: 'settings.update' })
}